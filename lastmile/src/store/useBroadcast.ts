import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ZoneId } from '../data/geo';
import { SOS_TEMPLATES, type SosTemplateId } from '../data/safety';
import type { EmergencyAlert, LanguageCode, Severity } from '../types';
import { networkProfile } from '../utils/channel';
import { smsText } from '../utils/content';
import { generateDataset, type Person } from '../utils/dataset';
import { nextRandom } from '../utils/random';
import { postBus } from '../utils/bus';
import { useStore } from './useStore';

/** Per-recipient status codes (kept numeric so thousands of recipients stay cheap). */
export const ST = { QUEUED: 0, SENDING: 1, DELIVERED: 2, SAFE: 3, HELP: 4, RETRYING: 5, HELD: 6 } as const;
export const ST_LABEL = ['Queued', 'Sending', 'Delivered', 'Marked safe', 'Needs help', 'Retrying', 'Held offline'];
export const CH_LABEL = ['App / internet', 'SMS', 'Community relay'];

export type BroadcastKind = 'alert' | 'sos';

export interface Broadcast {
  id: string;
  kind: BroadcastKind;
  alertId: string;
  severity: Severity;
  template: SosTemplateId | 'custom' | null;
  customText: string;
  zones: ZoneId[] | 'all';
  startedAt: number;
  finishedAt: number | null;
  tick: number;
  running: boolean;
  targets: number[];
  status: number[];
  channel: number[];
  retries: number[];
  deliveredVia: [number, number, number];
  failures: number;
  lastDeliveryTick: number;
  history: { tick: number; delivered: number; safe: number; help: number }[];
}

export interface Popup {
  id: string;
  kind: BroadcastKind;
  title: string;
  body: string;
  severity: Severity;
  alertId: string;
  at: number;
}

interface BroadcastState {
  dataset: Person[];
  datasetSeed: number;
  broadcast: Broadcast | null;
  past: { id: string; kind: BroadcastKind; title: string; recipients: number; delivered: number; safe: number; help: number; at: number }[];
  popup: Popup | null;
  offlineSim: boolean;
  browserOnline: boolean;
  composerOpen: boolean;
  seed: number;
  setComposerOpen: (v: boolean) => void;
  generate: (size: number, seed?: number) => void;
  start: (opts: { kind: BroadcastKind; alert: EmergencyAlert; template?: SosTemplateId | 'custom'; customText?: string; zones?: ZoneId[] | 'all' }) => void;
  tick: () => void;
  fastForward: (n: number) => void;
  setRunning: (running: boolean) => void;
  respond: (index: number, safe: boolean, force?: boolean) => void;
  respondPerson: (personId: number, safe: boolean, name: string) => void;
  dismissPopup: () => void;
  setOfflineSim: (v: boolean) => void;
  setBrowserOnline: (v: boolean) => void;
  reset: () => void;
}

export const DEFAULT_DATASET_SIZE = 1200;

export function messageFor(b: Pick<Broadcast, 'kind' | 'template' | 'customText'>, alert: EmergencyAlert, lang: LanguageCode) {
  if (b.kind === 'sos') {
    if (b.template && b.template !== 'custom') return SOS_TEMPLATES[b.template].text[lang];
    return `SOS: ${b.customText}`;
  }
  return smsText(alert, lang);
}

function initialChannel(p: Person, quality: number) {
  if (p.device === 'none') return 2;
  if (p.device === 'feature' || p.connectivity === 'none') return 1;
  if (quality < 20) return 1;
  if (p.connectivity === 'weak') return quality >= 60 ? 0 : 1;
  return quality >= 40 ? 0 : 1;
}

function notifyBrowser(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') new Notification(title, { body, tag: 'lastmile-sos' });
  } catch {
    /* notifications are optional */
  }
}

export const useBroadcast = create<BroadcastState>()(
  persist(
    (set, get) => ({
      dataset: generateDataset(DEFAULT_DATASET_SIZE, 42),
      datasetSeed: 42,
      broadcast: null,
      past: [],
      popup: null,
      offlineSim: false,
      browserOnline: typeof navigator === 'undefined' ? true : navigator.onLine,
      composerOpen: false,
      seed: 7,
      setComposerOpen: (v) => set({ composerOpen: v }),

      generate: (size, seed = Math.floor(Math.random() * 1e6)) => {
        set({ dataset: generateDataset(size, seed), datasetSeed: seed, broadcast: null });
        useStore.getState().log(`Temporary synthetic dataset generated: ${size.toLocaleString()} residents (seed ${seed}).`, 'info');
      },

      start: ({ kind, alert, template = null, customText = '', zones = 'all' }) => {
        const { dataset, broadcast } = get();
        const quality = useStore.getState().networkQuality;
        const targets = dataset.map((_, i) => i).filter((i) => zones === 'all' || zones.includes(dataset[i].zone));
        if (broadcast && broadcast.targets.length) archive(broadcast);
        const b: Broadcast = {
          id: `${kind === 'sos' ? 'SOS' : 'BRD'}-${Date.now().toString(36).toUpperCase()}`,
          kind,
          alertId: alert.id,
          severity: kind === 'sos' ? 'CRITICAL' : alert.severity,
          template,
          customText,
          zones,
          startedAt: Date.now(),
          finishedAt: null,
          tick: 0,
          running: true,
          targets,
          status: targets.map(() => ST.QUEUED),
          channel: targets.map((i) => initialChannel(dataset[i], quality)),
          retries: targets.map(() => 0),
          deliveredVia: [0, 0, 0],
          failures: 0,
          lastDeliveryTick: 0,
          history: [{ tick: 0, delivered: 0, safe: 0, help: 0 }],
        };
        const title = kind === 'sos' ? 'SOS — Emergency message' : `${alert.id}: ${alert.severity} alert`;
        const body = messageFor(b, alert, 'en');
        set({ broadcast: b, popup: { id: b.id, kind, title, body, severity: b.severity, alertId: alert.id, at: Date.now() } });
        notifyBrowser(`[DEMO] ${title}`, body);
        postBus({
          type: 'broadcast',
          message: {
            id: b.id,
            kind,
            severity: b.severity,
            hazard: alert.type,
            alertId: alert.id,
            title,
            text: { en: messageFor(b, alert, 'en'), hi: messageFor(b, alert, 'hi'), or: messageFor(b, alert, 'or'), bn: messageFor(b, alert, 'bn') },
            zones,
            at: b.startedAt,
          },
        });
        useStore.getState().log(`${kind === 'sos' ? 'SOS' : 'Alert'} broadcast ${b.id} started to ${targets.length.toLocaleString()} synthetic residents (simulated, network ${quality}%).`, kind === 'sos' ? 'error' : 'info');
      },

      tick: () => {
        const { broadcast: b, dataset, offlineSim, browserOnline } = get();
        if (!b || !b.running) return;
        const main = useStore.getState();
        const quality = main.networkQuality;
        const outage = main.outage;
        const offline = offlineSim || !browserOnline;
        const loss = networkProfile(quality).lossRate;
        const cap = [offline || outage ? 0 : Math.round(10 + quality * 1.8), offline || outage ? 0 : quality < 15 ? 35 : 70, 30];
        const used = [0, 0, 0];
        let seed = get().seed;
        const rand = () => {
          const [v, n] = nextRandom(seed);
          seed = n;
          return v;
        };
        const status = b.status.slice();
        const channel = b.channel.slice();
        const retries = b.retries.slice();
        const via: [number, number, number] = [...b.deliveredVia];
        let failures = b.failures;
        let lastDeliveryTick = b.lastDeliveryTick;
        const tickNo = b.tick + 1;

        for (let k = 0; k < status.length; k++) {
          const st = status[k];
          if (st === ST.SENDING) {
            status[k] = ST.DELIVERED;
            via[channel[k]] += 1;
            lastDeliveryTick = tickNo;
            continue;
          }
          if (st === ST.DELIVERED) {
            if (rand() < 0.1) status[k] = dataset[b.targets[k]].id % 23 === 0 ? ST.HELP : ST.SAFE;
            continue;
          }
          if (st !== ST.QUEUED && st !== ST.RETRYING && st !== ST.HELD) continue;
          const ch = channel[k];
          if (cap[ch] === 0) {
            // Operator offline → hold in the outbox. Network outage → fall back towards the relay.
            if (offline) status[k] = ST.HELD;
            else {
              channel[k] = 2;
              retries[k] = 0;
              status[k] = ST.RETRYING;
            }
            continue;
          }
          if (used[ch] >= cap[ch]) continue;
          used[ch] += 1;
          const failP = ch === 0 ? loss : ch === 1 ? Math.min(0.2, loss * 0.35) : 0.03;
          if (rand() < failP) {
            failures += 1;
            retries[k] += 1;
            status[k] = ST.RETRYING;
            if (retries[k] > 2 && ch < 2) {
              channel[k] = ch + 1;
              retries[k] = 0;
            }
          } else status[k] = ST.SENDING;
        }

        const count = (c: number) => status.reduce((n, s) => n + (s === c ? 1 : 0), 0);
        const safe = count(ST.SAFE);
        const help = count(ST.HELP);
        const delivered = count(ST.DELIVERED) + safe + help;
        const pending = status.some((s) => s === ST.QUEUED || s === ST.SENDING || s === ST.RETRYING || s === ST.HELD);
        const done = !pending && (count(ST.DELIVERED) === 0 || tickNo - lastDeliveryTick > 25);
        set({
          seed,
          broadcast: {
            ...b,
            tick: tickNo,
            status,
            channel,
            retries,
            deliveredVia: via,
            failures,
            lastDeliveryTick,
            running: !done,
            finishedAt: done ? Date.now() : null,
            history: [...b.history, { tick: tickNo, delivered, safe, help }].slice(-200),
          },
        });
        if (done) main.log(`Broadcast ${b.id} complete — ${delivered.toLocaleString()}/${status.length.toLocaleString()} reached, ${help} need help.`, 'success');
      },

      fastForward: (n) => {
        for (let i = 0; i < n && get().broadcast?.running; i++) get().tick();
      },

      setRunning: (running) => {
        const b = get().broadcast;
        if (b) set({ broadcast: { ...b, running } });
      },

      respond: (index, safe, force = false) => {
        const b = get().broadcast;
        if (!b || (!force && (b.status[index] < ST.DELIVERED || b.status[index] > ST.HELP))) return;
        const status = b.status.slice();
        status[index] = safe ? ST.SAFE : ST.HELP;
        set({ broadcast: { ...b, status } });
      },

      respondPerson: (personId, safe, name) => {
        const { broadcast: b, dataset } = get();
        if (!b) return;
        const k = b.targets.findIndex((idx) => dataset[idx]?.id === personId);
        if (k >= 0) get().respond(k, safe, true);
        useStore.getState().log(`Resident ${name} replied from their phone: ${safe ? '"I am safe"' : '"I need help"'}.`, safe ? 'success' : 'warning');
      },

      dismissPopup: () => set({ popup: null }),

      setOfflineSim: (v) => {
        set({ offlineSim: v });
        useStore.getState().log(v ? 'Operator console OFFLINE (simulated) — new messages are held in the outbox; community relay keeps working.' : 'Back ONLINE — outbox messages are being sent.', v ? 'warning' : 'success');
      },

      setBrowserOnline: (v) => set({ browserOnline: v }),

      reset: () => {
        const b = get().broadcast;
        if (b && b.targets.length) archive(b);
        set({ broadcast: null, popup: null });
      },
    }),
    {
      name: 'lastmile-broadcast-v1',
      version: 1,
      partialize: (s) => ({ dataset: s.dataset, datasetSeed: s.datasetSeed, broadcast: s.broadcast ? { ...s.broadcast, running: false } : null, past: s.past, offlineSim: s.offlineSim, seed: s.seed }),
    },
  ),
);

function archive(b: Broadcast) {
  const safe = b.status.filter((s) => s === ST.SAFE).length;
  const help = b.status.filter((s) => s === ST.HELP).length;
  const delivered = b.status.filter((s) => s >= ST.DELIVERED && s <= ST.HELP).length;
  useBroadcast.setState((s) => ({
    past: [{ id: b.id, kind: b.kind, title: b.kind === 'sos' ? `SOS (${b.template ?? 'custom'})` : `Alert ${b.alertId}`, recipients: b.targets.length, delivered, safe, help, at: b.startedAt }, ...s.past].slice(0, 10),
  }));
}

/** Aggregates used across pages. */
export function summarize(b: Broadcast | null) {
  if (!b) return { total: 0, delivered: 0, safe: 0, help: 0, pending: 0, held: 0, retrying: 0, pct: 0 };
  const c = [0, 0, 0, 0, 0, 0, 0];
  for (const s of b.status) c[s] += 1;
  const delivered = c[ST.DELIVERED] + c[ST.SAFE] + c[ST.HELP];
  const total = b.status.length;
  return { total, delivered, safe: c[ST.SAFE], help: c[ST.HELP], pending: total - delivered, held: c[ST.HELD], retrying: c[ST.RETRYING], pct: total ? Math.round((delivered / total) * 100) : 0 };
}
