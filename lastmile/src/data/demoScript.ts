import { useBroadcast } from '../store/useBroadcast';
import { useStore, type DemoMode } from '../store/useStore';
import { INITIAL_NODES } from './network';

export interface DemoStep {
  title: string;
  narration: string;
  route: string;
  durationMs: number;
  run: () => void;
}

const st = () => useStore.getState();
const bc = () => useBroadcast.getState();
const current = () => st().selectedAlertId;
const currentAlert = () => st().alerts.find((a) => a.id === current()) ?? st().alerts[0];

function resetForDemo(alertId: string) {
  const s = st();
  s.selectAlert(alertId);
  s.resetPipeline(alertId);
  s.set('nodes', INITIAL_NODES);
  s.set('networkQuality', 100);
  s.set('outage', false);
  s.set('channelMode', 'auto');
  s.set('injectOmission', false);
  s.set('translationOutage', false);
  s.set('autoAck', true);
  s.set('autoRecover', true);
  bc().setOfflineSim(false);
  bc().reset();
}

/** Runs the 12-recipient tracked network until everyone has at least received the alert. */
function deliverTracked() {
  for (let i = 0; i < 120 && st().simRunning; i++) {
    const pending = st().deliveries.filter((d) => d.alertId === current() && !['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status));
    if (!pending.length) break;
    st().tick();
  }
  for (const d of st().deliveries.filter((x) => x.alertId === current() && x.status === 'DELIVERED')) {
    st().acknowledge(d.id, d.recipient.id === 'P007' ? 'needHelp' : 'understood');
  }
  st().setSimRunning(false);
}

const STEPS: Record<string, DemoStep> = {
  receive: { title: 'Receive the official alert', narration: 'A synthetic flash-flood warning arrives from the Demo Meteorological Department — shown exactly as received, on its own tab.', route: '/alerts/official', durationMs: 5000, run: () => { resetForDemo('FLD-DEMO-001'); st().log('Demo started — official flood alert received.', 'info'); } },
  validate: { title: 'Check the core facts', narration: 'Hazard, severity, area, time and action are extracted and confirmed in the source text. Precautions are shown separately.', route: '/alerts/official', durationMs: 4500, run: () => st().validateOfficialAlert(current()) },
  simplify: { title: 'Simplify the language', narration: 'Technical wording becomes short, clear sentences — with a meaning-preservation check.', route: '/alerts/simplified', durationMs: 5000, run: () => st().runPlain(current()) },
  translate: { title: 'Translate', narration: 'Hindi, Odia and Bengali versions are generated from the phrase bank and re-checked for every core fact.', route: '/alerts/translations', durationMs: 5000, run: () => { st().generateTranslations(current(), ['hi', 'or', 'bn']); st().set('previewLanguage', 'or'); } },
  visual: { title: 'Visual & voice version', narration: 'Icon-first, low-literacy card with voice playback — same facts, far lower reading load.', route: '/alerts/visual', durationMs: 5000, run: () => { (['en', 'hi', 'or', 'bn'] as const).forEach((l) => st().generateVisual(current(), l)); st().set('visualMode', 'lowLiteracy'); st().set('previewLanguage', 'hi'); } },
  map: { title: 'Show the disaster on the map', narration: 'High-risk zones, open and unsafe relief sites, and evacuation routes on an offline map.', route: '/map', durationMs: 5500, run: () => undefined },
  broadcast: { title: 'Broadcast to every resident', narration: 'Network drops to 20%: the alert goes out as compressed text and SMS, each resident in their own language.', route: '/broadcast/all', durationMs: 6000, run: () => { st().set('networkQuality', 20); bc().start({ kind: 'alert', alert: currentAlert() }); bc().fastForward(4); } },
  outage: { title: 'Internet and cellular outage', narration: 'Direct channels fail — the fallback strategy moves messages to the community relay automatically.', route: '/broadcast/all', durationMs: 6000, run: () => { st().set('outage', true); bc().fastForward(8); } },
  relay: { title: 'Community relay network', narration: 'A tracked sample of 12 recipients: Relay B starts offline, queues messages, then forwards them when it comes back.', route: '/broadcast/network', durationMs: 6000, run: () => { st().startDelivery(current()); st().fastForward(13); } },
  sos: { title: 'Send SOS to everyone', narration: 'The admin sends "Evacuate now". Every resident gets a pop-up — resident phones ring an SOS alarm.', route: '/', durationMs: 6500, run: () => { st().set('outage', false); st().set('networkQuality', 60); bc().start({ kind: 'sos', alert: currentAlert(), template: 'evacuate' }); bc().fastForward(6); } },
  responses: { title: 'Residents respond', narration: 'Residents mark themselves safe or ask for help. Help requests go to a dispatch list.', route: '/responses/residents', durationMs: 6000, run: () => { bc().fastForward(45); deliverTracked(); } },
  shelters: { title: 'Shelters fill up', narration: 'People from high-risk zones who marked themselves safe are counted into the nearest open shelter.', route: '/map', durationMs: 5000, run: () => bc().fastForward(20) },
  integrity: { title: 'One source of truth', narration: 'Every version traces back to the official alert, with the core facts verified at each step.', route: '/alerts/integrity', durationMs: 6000, run: () => st().log('Demo complete.', 'success') },
};

const JUDGE = ['receive', 'validate', 'simplify', 'translate', 'visual', 'map', 'broadcast', 'outage', 'relay', 'sos', 'responses', 'shelters', 'integrity'].map((k) => STEPS[k]);
const FULL = ['receive', 'simplify', 'translate', 'visual', 'map', 'broadcast', 'sos', 'responses', 'integrity'].map((k) => STEPS[k]);

export const DEMO_SCRIPTS: Record<DemoMode, DemoStep[]> = { full: FULL, judge: JUDGE };

/** Executes steps so the workspace reflects `target`. Going backwards replays from the start. */
export function goToDemoStep(mode: DemoMode, target: number) {
  const steps = DEMO_SCRIPTS[mode];
  const clamped = Math.max(0, Math.min(steps.length - 1, target));
  const { demo } = st();
  const from = demo.mode === mode && clamped > demo.step ? demo.step + 1 : 0;
  for (let i = from; i <= clamped; i++) steps[i].run();
  st().setDemo({ mode, step: clamped, finished: false });
}

export function launchDemo(mode: DemoMode) {
  st().startDemo(mode);
  DEMO_SCRIPTS[mode][0].run();
}
