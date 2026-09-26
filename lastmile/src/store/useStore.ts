import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SEED_ALERTS } from '../data/alerts';
import { languageInfo, LANGUAGES } from '../data/languages';
import { CHANNEL_LABEL, INITIAL_NODES, RECIPIENTS } from '../data/network';
import type {
  A11ySettings,
  AckSnapshot,
  AckType,
  ActivityEntry,
  AlertTransformation,
  Channel,
  CommunityNote,
  DeliveryRecord,
  DeliveryStatus,
  EmergencyAlert,
  LanguageCode,
  LogKind,
  PersonaId,
  RelayNode,
  TransformationType,
  VisualMode,
} from '../types';
import { FORMAT_FOR_PERSONA, isRelayChannel, networkProfile, nextFallback, recommendChannel } from '../utils/channel';
import { plainLanguageText, smsText, visualText } from '../utils/content';
import { nextRandom, uid } from '../utils/random';
import { validateContent, validateOfficial } from '../utils/validation';

export type DemoMode = 'full' | 'judge';

export interface DemoState {
  mode: DemoMode | null;
  step: number;
  paused: boolean;
  finished: boolean;
}

const MAX_RETRIES = 2;
const AUTO_RECOVER_TICK = 12;
const FINAL_STATUSES: DeliveryStatus[] = ['ACKNOWLEDGED', 'NEEDS_HELP'];

interface State {
  alerts: EmergencyAlert[];
  selectedAlertId: string;
  validatedAt: Record<string, number>;
  transformations: AlertTransformation[];
  selectedLanguages: LanguageCode[];
  previewLanguage: LanguageCode;
  targetPersonas: PersonaId[];
  activePersona: PersonaId;
  visualMode: VisualMode;
  injectOmission: boolean;
  translationOutage: boolean;
  communityNotes: CommunityNote[];
  deliveries: DeliveryRecord[];
  deliveryAlertId: string | null;
  nodes: RelayNode[];
  networkQuality: number;
  channelMode: 'auto' | Channel;
  outage: boolean;
  autoAck: boolean;
  autoRecover: boolean;
  simRunning: boolean;
  simTick: number;
  seed: number;
  ackHistory: AckSnapshot[];
  activity: ActivityEntry[];
  a11y: A11ySettings;
  demo: DemoState;
}

interface Actions {
  log: (message: string, kind?: LogKind) => void;
  selectAlert: (id: string) => void;
  validateOfficialAlert: (alertId: string) => boolean;
  runPlain: (alertId: string) => AlertTransformation;
  generateTranslations: (alertId: string, langs: LanguageCode[]) => { ok: LanguageCode[]; failed: LanguageCode[] };
  generateVisual: (alertId: string, lang: LanguageCode) => AlertTransformation;
  buildSms: (alertId: string, lang: LanguageCode) => AlertTransformation;
  buildPipeline: (alertId: string) => void;
  resetPipeline: (alertId: string) => void;
  addAlert: (alert: EmergencyAlert) => void;
  duplicateAlert: (alertId: string) => string;
  deleteAlert: (alertId: string) => void;
  addCommunityNote: (alertId: string, author: string, text: string) => void;
  removeCommunityNote: (id: string) => void;
  startDelivery: (alertId: string) => void;
  setSimRunning: (running: boolean) => void;
  tick: () => void;
  fastForward: (ticks: number) => void;
  setNodeStatus: (id: string, status: RelayNode['status']) => void;
  acknowledge: (recordId: string, ack: AckType) => void;
  set: <K extends keyof State>(key: K, value: State[K]) => void;
  setA11y: (patch: Partial<A11ySettings>) => void;
  startDemo: (mode: DemoMode) => void;
  setDemo: (patch: Partial<DemoState>) => void;
  resetAll: () => void;
}

export type Store = State & Actions;

const initialState = (): State => ({
  alerts: SEED_ALERTS,
  selectedAlertId: SEED_ALERTS[0].id,
  validatedAt: {},
  transformations: [],
  selectedLanguages: ['en', 'hi', 'or'],
  previewLanguage: 'hi',
  targetPersonas: ['general', 'lowLiteracy', 'olderAdult'],
  activePersona: 'lowLiteracy',
  visualMode: 'lowLiteracy',
  injectOmission: false,
  translationOutage: false,
  communityNotes: [
    {
      id: 'note-seed-1',
      alertId: 'FLD-DEMO-001',
      author: 'Demo Volunteer, Ward 7',
      text: 'Community shelter is available at Demo School Building (first floor).',
      createdAt: 0,
    },
  ],
  deliveries: [],
  deliveryAlertId: null,
  nodes: INITIAL_NODES,
  networkQuality: 100,
  channelMode: 'auto',
  outage: false,
  autoAck: true,
  autoRecover: true,
  simRunning: false,
  simTick: 0,
  seed: 20260926,
  ackHistory: [],
  activity: [],
  a11y: { textSize: 'normal', reducedMotion: false, highContrast: false },
  demo: { mode: null, step: 0, paused: false, finished: false },
});

const SOURCE_TYPE: Record<TransformationType, AlertTransformation['sourceType']> = {
  plain: 'simplified',
  translation: 'translated',
  visual: 'generated',
  sms: 'generated',
};

/** Route (node ids) a relay-channel message must traverse. */
export function relayPath(record: DeliveryRecord): string[] {
  if (!isRelayChannel(record.channel)) return [];
  const base = ['hub', record.recipient.relayNode];
  return record.channel === 'offlineRelay' ? [...base, 'local', 'cluster'] : base;
}

const speedFor = (channel: Channel, quality: number) => {
  switch (channel) {
    case 'internet':
      return Math.max(6, quality * 0.7);
    case 'lowBandwidth':
      return Math.max(14, quality * 0.5 + 12);
    case 'sms':
      return 34;
    case 'communityRelay':
      return 24;
    case 'offlineRelay':
      return 17;
  }
};

const hopsFor = (channel: Channel) => ({ internet: 2, lowBandwidth: 2, sms: 3, communityRelay: 4, offlineRelay: 5 })[channel];

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const findAlert = (id: string) => get().alerts.find((a) => a.id === id);

      const upsert = (t: Omit<AlertTransformation, 'id' | 'generatedAt' | 'sourceType'>): AlertTransformation => {
        const existing = get().transformations.find(
          (x) => x.alertId === t.alertId && x.type === t.type && x.language === t.language,
        );
        const full: AlertTransformation = {
          ...t,
          id: existing?.id ?? `${t.alertId}-${t.type.toUpperCase()}-${t.language.toUpperCase()}-v${Date.now().toString(36).slice(-4)}`,
          generatedAt: Date.now(),
          sourceType: SOURCE_TYPE[t.type],
        };
        set((s) => ({
          transformations: [...s.transformations.filter((x) => x !== existing), full],
        }));
        return full;
      };

      const getT = (alertId: string, type: TransformationType, lang: LanguageCode) =>
        get().transformations.find((x) => x.alertId === alertId && x.type === type && x.language === lang);

      return {
        ...initialState(),

        log: (message, kind = 'info') =>
          set((s) => ({ activity: [{ id: uid('log'), time: Date.now(), message, kind }, ...s.activity].slice(0, 150) })),

        selectAlert: (id) => {
          if (!findAlert(id)) return;
          set({ selectedAlertId: id });
        },

        validateOfficialAlert: (alertId) => {
          const alert = findAlert(alertId);
          if (!alert) return false;
          const result = validateOfficial(alert);
          set((s) => ({ validatedAt: { ...s.validatedAt, [alertId]: Date.now() } }));
          get().log(
            result.passed
              ? `Official alert ${alertId} received and structurally validated (all core fields present).`
              : `Official alert ${alertId} received — some structured fields are not restated in the message text.`,
            result.passed ? 'success' : 'warning',
          );
          return result.passed;
        },

        runPlain: (alertId) => {
          const alert = findAlert(alertId)!;
          if (!get().validatedAt[alertId]) get().validateOfficialAlert(alertId);
          const content = plainLanguageText(alert, 'en', { injectOmission: get().injectOmission });
          const t = upsert({
            alertId,
            parentId: alertId,
            type: 'plain',
            language: 'en',
            content,
            validation: validateContent(alert, 'en', content),
          });
          get().log(
            t.validation.passed
              ? 'Plain-language version generated by Clarity Processor — meaning integrity check passed.'
              : 'Plain-language version generated — ⚠ CONTENT VALIDATION REQUIRED (a core fact is missing).',
            t.validation.passed ? 'success' : 'error',
          );
          return t;
        },

        generateTranslations: (alertId, langs) => {
          const alert = findAlert(alertId)!;
          const plain = getT(alertId, 'plain', 'en') ?? get().runPlain(alertId);
          const ok: LanguageCode[] = [];
          const failed: LanguageCode[] = [];
          for (const lang of langs) {
            if (lang === 'en') continue;
            if (get().translationOutage) {
              failed.push(lang);
              get().log(
                `Translation unavailable for ${languageInfo(lang).name} (simulated outage) — fallback: English plain-language version will be sent; retry queued.`,
                'error',
              );
              continue;
            }
            const content = plainLanguageText(alert, lang);
            const t = upsert({
              alertId,
              parentId: plain.id,
              type: 'translation',
              language: lang,
              content,
              validation: validateContent(alert, lang, content),
            });
            ok.push(lang);
            get().log(
              `${languageInfo(lang).name} translation generated${t.validation.untranslated.length ? ' (partial: free-text fields kept in official wording)' : ''}.`,
              t.validation.untranslated.length ? 'warning' : 'success',
            );
          }
          return { ok, failed };
        },

        generateVisual: (alertId, lang) => {
          const alert = findAlert(alertId)!;
          const parent = lang === 'en' ? getT(alertId, 'plain', 'en') ?? get().runPlain(alertId) : getT(alertId, 'translation', lang);
          const content = visualText(alert, lang);
          const t = upsert({
            alertId,
            parentId: parent?.id ?? alertId,
            type: 'visual',
            language: lang,
            content,
            validation: validateContent(alert, lang, content),
          });
          get().log(`Visual / low-literacy version generated (${languageInfo(lang).name}).`, 'success');
          return t;
        },

        buildSms: (alertId, lang) => {
          const alert = findAlert(alertId)!;
          const parent = getT(alertId, 'visual', lang) ?? getT(alertId, lang === 'en' ? 'plain' : 'translation', lang);
          const content = smsText(alert, lang);
          const t = upsert({
            alertId,
            parentId: parent?.id ?? alertId,
            type: 'sms',
            language: lang,
            content,
            validation: validateContent(alert, lang, content),
          });
          get().log(`SMS package prepared (${languageInfo(lang).name}, ${[...content].length} chars).`, 'info');
          return t;
        },

        buildPipeline: (alertId) => {
          const s = get();
          s.validateOfficialAlert(alertId);
          s.runPlain(alertId);
          s.generateTranslations(alertId, LANGUAGES.map((l) => l.code));
          for (const l of LANGUAGES) {
            if (l.code !== 'en' && !getT(alertId, 'translation', l.code)) continue;
            s.generateVisual(alertId, l.code);
            s.buildSms(alertId, l.code);
          }
        },

        resetPipeline: (alertId) =>
          set((s) => {
            const { [alertId]: _removed, ...validatedAt } = s.validatedAt;
            void _removed;
            return {
              validatedAt,
              transformations: s.transformations.filter((t) => t.alertId !== alertId),
              deliveries: s.deliveries.filter((d) => d.alertId !== alertId),
              simRunning: s.deliveryAlertId === alertId ? false : s.simRunning,
              ackHistory: s.deliveryAlertId === alertId ? [] : s.ackHistory,
            };
          }),

        addAlert: (alert) => {
          set((s) => ({ alerts: [alert, ...s.alerts], selectedAlertId: alert.id }));
          get().log(`Synthetic user-created alert ${alert.id} added.`, 'info');
        },

        duplicateAlert: (alertId) => {
          const alert = findAlert(alertId)!;
          const id = `${alert.id.split('-')[0]}-USER-${Math.floor(Date.now() / 1000) % 100000}`;
          get().addAlert({ ...alert, id, demoStatus: 'SYNTHETIC_USER_CREATED', createdAt: Date.now() });
          return id;
        },

        deleteAlert: (alertId) => {
          const s = get();
          const alert = findAlert(alertId);
          if (!alert || alert.demoStatus !== 'SYNTHETIC_USER_CREATED' || s.demo.mode) return;
          const alerts = s.alerts.filter((a) => a.id !== alertId);
          s.resetPipeline(alertId);
          set({ alerts, selectedAlertId: s.selectedAlertId === alertId ? alerts[0].id : s.selectedAlertId });
          get().log(`User-created alert ${alertId} removed.`, 'info');
        },

        addCommunityNote: (alertId, author, text) => {
          set((s) => ({
            communityNotes: [...s.communityNotes, { id: uid('note'), alertId, author, text, createdAt: Date.now() }],
          }));
          get().log(`Community note added by "${author}" (kept separate from the official alert).`, 'info');
        },

        removeCommunityNote: (id) => set((s) => ({ communityNotes: s.communityNotes.filter((n) => n.id !== id) })),

        startDelivery: (alertId) => {
          const s = get();
          const plain = getT(alertId, 'plain', 'en');
          if (!plain) s.runPlain(alertId);
          const records: DeliveryRecord[] = RECIPIENTS.map((recipient) => {
            // Fall back to English when that recipient's translation is missing.
            const language = recipient.language === 'en' || getT(alertId, 'translation', recipient.language) ? recipient.language : 'en';
            const channel = s.channelMode === 'auto' ? recommendChannel(recipient, s.networkQuality, s.outage).channel : s.channelMode;
            return {
              id: `${alertId}-${recipient.id}`,
              alertId,
              recipient,
              language,
              format: channel === 'sms' ? 'SMS' : FORMAT_FOR_PERSONA[recipient.persona],
              channel,
              channelHistory: [channel],
              status: 'QUEUED',
              timestamp: Date.now(),
              acknowledged: null,
              retryCount: 0,
              progress: 0,
              ticksInFlight: 0,
              simSeconds: 0,
              hops: 0,
            };
          });
          for (const l of new Set(records.map((r) => r.language))) if (!getT(alertId, 'sms', l)) s.buildSms(alertId, l);
          set((st) => ({
            deliveries: [...st.deliveries.filter((d) => d.alertId !== alertId), ...records],
            deliveryAlertId: alertId,
            simRunning: true,
            simTick: 0,
            ackHistory: [{ tick: 0, delivered: 0, acknowledged: 0, needsHelp: 0 }],
            nodes: st.nodes.map((n) => ({ ...n, queue: 0, forwarded: 0 })),
          }));
          const p = networkProfile(s.networkQuality);
          get().log(
            `Simulated delivery started for ${records.length} synthetic recipients — network ${s.networkQuality}% (${p.label}), mode: ${s.channelMode === 'auto' ? 'Auto (demo recommendation)' : CHANNEL_LABEL[s.channelMode]}.`,
            s.networkQuality < 50 ? 'warning' : 'info',
          );
        },

        setSimRunning: (running) => set({ simRunning: running }),

        tick: () => {
          const s = get();
          if (!s.simRunning || !s.deliveryAlertId) return;
          let seed = s.seed;
          const rand = () => {
            const [v, n] = nextRandom(seed);
            seed = n;
            return v;
          };
          const profile = networkProfile(s.networkQuality);
          const logs: [string, LogKind][] = [];
          const tickNo = s.simTick + 1;

          let nodes = s.nodes;
          if (s.autoRecover && tickNo === AUTO_RECOVER_TICK) {
            const offline = nodes.filter((n) => n.status === 'offline');
            if (offline.length) {
              nodes = nodes.map((n) => (n.status === 'offline' ? { ...n, status: 'online' } : n));
              offline.forEach((n) => logs.push([`${n.name} is back ONLINE — forwarding queued messages.`, 'success']));
            }
          }
          const nodeStatus = (id: string) => nodes.find((n) => n.id === id)?.status ?? 'online';
          const forwarded: Record<string, number> = {};
          const now = Date.now();
          const tickSeconds = (c: Channel) => (c === 'sms' ? 1.5 : isRelayChannel(c) ? 6 : (profile.latencyMs / 1000) * 2);

          const deliveries = s.deliveries.map((rec): DeliveryRecord => {
            if (rec.alertId !== s.deliveryAlertId) return rec;
            const r = { ...rec };
            const path = relayPath(r);
            switch (r.status) {
              case 'QUEUED': {
                if (path.some((id) => nodeStatus(id) === 'offline')) {
                  r.simSeconds += tickSeconds(r.channel);
                  return r;
                }
                r.status = 'IN_TRANSIT';
                r.progress = 0;
                break;
              }
              case 'IN_TRANSIT': {
                const blockedByOutage = s.outage && !isRelayChannel(r.channel);
                const degraded = path.some((id) => nodeStatus(id) === 'degraded');
                const failChance = blockedByOutage
                  ? 1
                  : r.channel === 'internet'
                    ? profile.lossRate
                    : r.channel === 'lowBandwidth'
                      ? profile.lossRate * 0.6
                      : r.channel === 'sms'
                        ? Math.min(0.25, profile.lossRate * 0.35)
                        : degraded
                          ? 0.06
                          : 0.03;
                if (path.some((id) => nodeStatus(id) === 'offline')) {
                  r.status = 'QUEUED';
                  logs.push([`${r.recipient.name}: relay went offline mid-route — message re-queued.`, 'warning']);
                  break;
                }
                if (rand() < failChance) {
                  r.status = 'FAILED';
                  logs.push([
                    blockedByOutage
                      ? `${r.recipient.name}: ${CHANNEL_LABEL[r.channel]} unavailable (simulated outage).`
                      : `${r.recipient.name}: ${CHANNEL_LABEL[r.channel]} attempt failed (simulated packet loss).`,
                    'error',
                  ]);
                  break;
                }
                r.progress = Math.min(100, r.progress + speedFor(r.channel, s.networkQuality));
                r.ticksInFlight += 1;
                r.simSeconds += tickSeconds(r.channel);
                if (r.progress >= 100) {
                  r.status = 'DELIVERED';
                  r.hops = hopsFor(r.channel);
                  path.forEach((id) => (forwarded[id] = (forwarded[id] ?? 0) + 1));
                  logs.push([
                    path.length
                      ? `Message delivered via ${nodes.find((n) => n.id === r.recipient.relayNode)?.name} to ${r.recipient.name}.`
                      : `Message delivered to ${r.recipient.name} via ${CHANNEL_LABEL[r.channel]}.`,
                    'success',
                  ]);
                }
                break;
              }
              case 'FAILED': {
                const limit = s.outage && !isRelayChannel(r.channel) ? 0 : MAX_RETRIES;
                if (r.retryCount >= limit) {
                  const next = nextFallback(r.channel);
                  if (next) {
                    logs.push([`Fallback Strategy Active — ${r.recipient.name}: ${CHANNEL_LABEL[r.channel]} → ${CHANNEL_LABEL[next]}.`, 'warning']);
                    r.channel = next;
                    r.channelHistory = [...r.channelHistory, next];
                    r.format = next === 'sms' ? 'SMS' : FORMAT_FOR_PERSONA[r.recipient.persona];
                    r.retryCount = 0;
                    r.status = 'QUEUED';
                    break;
                  }
                }
                r.retryCount += 1;
                r.status = 'RETRYING';
                break;
              }
              case 'RETRYING': {
                r.status = 'IN_TRANSIT';
                r.progress = 0;
                break;
              }
              case 'DELIVERED': {
                if (s.autoAck && rand() < 0.3) {
                  const ack: AckType = r.recipient.id === 'P007' ? 'needHelp' : r.recipient.id === 'P004' ? 'received' : 'understood';
                  r.acknowledged = ack;
                  r.status = ack === 'needHelp' ? 'NEEDS_HELP' : 'ACKNOWLEDGED';
                  logs.push([
                    ack === 'needHelp' ? `${r.recipient.name} responded: "I need help" — flagged for responders.` : `${r.recipient.name} acknowledged the alert.`,
                    ack === 'needHelp' ? 'warning' : 'success',
                  ]);
                }
                break;
              }
              default:
                return r;
            }
            r.timestamp = now;
            return r;
          });

          const current = deliveries.filter((d) => d.alertId === s.deliveryAlertId);
          nodes = nodes.map((n) => ({
            ...n,
            forwarded: n.forwarded + (forwarded[n.id] ?? 0),
            queue: current.filter((d) => d.status === 'QUEUED' && relayPath(d).find((id) => nodeStatus(id) === 'offline') === n.id).length,
          }));
          const deliveredCount = current.filter((d) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status)).length;
          const done = current.every((d) => FINAL_STATUSES.includes(d.status) || (!s.autoAck && d.status === 'DELIVERED'));
          if (done) logs.push([`Delivery run complete — ${deliveredCount}/${current.length} synthetic recipients reached.`, 'success']);

          set({
            deliveries,
            nodes,
            seed,
            simTick: tickNo,
            simRunning: !done,
            ackHistory: [
              ...s.ackHistory,
              {
                tick: tickNo,
                delivered: deliveredCount,
                acknowledged: current.filter((d) => d.status === 'ACKNOWLEDGED').length,
                needsHelp: current.filter((d) => d.status === 'NEEDS_HELP').length,
              },
            ].slice(-80),
          });
          logs.reverse().forEach(([m, k]) => get().log(m, k));
        },

        fastForward: (ticks) => {
          for (let i = 0; i < ticks && get().simRunning; i++) get().tick();
        },

        setNodeStatus: (id, status) => {
          const node = get().nodes.find((n) => n.id === id);
          set((s) => ({ nodes: s.nodes.map((n) => (n.id === id ? { ...n, status } : n)) }));
          if (node) get().log(`${node.name} set ${status.toUpperCase()}.`, status === 'offline' ? 'error' : status === 'degraded' ? 'warning' : 'success');
        },

        acknowledge: (recordId, ack) => {
          const rec = get().deliveries.find((d) => d.id === recordId);
          if (!rec || !['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(rec.status)) return;
          set((s) => ({
            deliveries: s.deliveries.map((d) =>
              d.id === recordId
                ? { ...d, acknowledged: ack, status: ack === 'needHelp' ? 'NEEDS_HELP' : 'ACKNOWLEDGED', timestamp: Date.now() }
                : d,
            ),
          }));
          const text = { received: 'I received this alert', understood: 'I understand what to do', needHelp: 'I need help' }[ack];
          get().log(`${rec.recipient.name} responded: "${text}".`, ack === 'needHelp' ? 'warning' : 'success');
        },

        set: (key, value) => set({ [key]: value } as Pick<State, typeof key>),

        setA11y: (patch) => set((s) => ({ a11y: { ...s.a11y, ...patch } })),

        startDemo: (mode) => set({ demo: { mode, step: 0, paused: false, finished: false } }),

        setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),

        resetAll: () => {
          set({ ...initialState(), a11y: get().a11y });
          get().log('Demo workspace reset to initial synthetic state.', 'info');
        },
      };
    },
    {
      name: 'lastmile-demo-v1',
      version: 1,
      partialize: (s) => {
        const { demo: _demo, simRunning: _running, ...rest } = s;
        void _demo;
        void _running;
        return rest;
      },
    },
  ),
);

/** Convenience selector for the currently selected alert. */
export const useSelectedAlert = () =>
  useStore((s) => s.alerts.find((a) => a.id === s.selectedAlertId) ?? s.alerts[0]);

export const findTransformation = (list: AlertTransformation[], alertId: string, type: TransformationType, lang: LanguageCode) =>
  list.find((t) => t.alertId === alertId && t.type === type && t.language === lang);
