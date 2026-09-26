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
const current = () => st().selectedAlertId;

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
}

/** Runs ticks until every recipient is at least delivered (bounded, deterministic). */
function deliverAll() {
  for (let i = 0; i < 120 && st().simRunning; i++) {
    const pending = st().deliveries.filter((d) => d.alertId === current() && !['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status));
    if (!pending.length) break;
    st().tick();
  }
}

function acknowledgeRemaining() {
  for (const d of st().deliveries.filter((x) => x.alertId === current() && x.status === 'DELIVERED')) {
    st().acknowledge(d.id, d.recipient.id === 'P007' ? 'needHelp' : 'understood');
  }
  st().setSimRunning(false);
}

const FULL: DemoStep[] = [
  { title: 'Receive official alert', narration: 'A synthetic official alert arrives from a demo source system — shown exactly as received.', route: '/official', durationMs: 4500, run: () => { resetForDemo(current()); st().log('Full demo started — official alert received.', 'info'); } },
  { title: 'Validate original message', narration: 'Deterministic checks confirm hazard, severity, area, time and action are present in the source.', route: '/official', durationMs: 4000, run: () => st().validateOfficialAlert(current()) },
  { title: 'Convert to plain language', narration: 'The Clarity Processor rewrites jargon into short sentences — meaning, urgency and facts stay locked.', route: '/clarity', durationMs: 5000, run: () => st().runPlain(current()) },
  { title: 'Translate', narration: 'The Language Bank produces Hindi, Odia and Bengali demo translations, each re-validated.', route: '/language', durationMs: 5000, run: () => { st().generateTranslations(current(), ['hi', 'or', 'bn']); st().set('previewLanguage', 'hi'); } },
  { title: 'Create visual version', narration: 'Visual Studio builds an icon-first, low-literacy version with voice playback.', route: '/visual', durationMs: 5000, run: () => { (['en', 'hi', 'or', 'bn'] as const).forEach((l) => st().generateVisual(current(), l)); st().set('visualMode', 'lowLiteracy'); } },
  { title: 'Simulate low-bandwidth delivery', narration: 'Network drops to 30%: latency rises, packets are lost, retries and fallbacks kick in.', route: '/delivery', durationMs: 6000, run: () => { st().set('networkQuality', 30); st().startDelivery(current()); } },
  { title: 'Simulate community relay', narration: 'Community Relay B starts offline — its messages queue, then forward when it comes back online.', route: '/delivery', durationMs: 6000, run: () => st().fastForward(13) },
  { title: 'Recipient receives warning', narration: 'Every synthetic recipient receives the alert in their language and format.', route: '/receipts', durationMs: 5000, run: deliverAll },
  { title: 'Recipient acknowledges', narration: 'Recipients confirm "I understand what to do" — or ask for help, which is flagged.', route: '/receipts', durationMs: 5000, run: acknowledgeRemaining },
  { title: 'Dashboard updates', narration: 'Metrics, lineage and analytics update from the simulated events.', route: '/', durationMs: 4500, run: () => st().log('Full demo complete — alert reached the last mile (simulation).', 'success') },
];

const JUDGE: DemoStep[] = [
  { title: 'Receive official flood alert', narration: 'Synthetic flash-flood warning FLD-DEMO-001 arrives from the Demo Meteorological Department.', route: '/official', durationMs: 4500, run: () => { resetForDemo('FLD-DEMO-001'); st().log('Judge demo started — official flood alert received.', 'info'); } },
  { title: 'Show original technical wording', narration: '"Anticipated inundation", "riverine overflow", "inundated carriageways" — accurate, but hard for many people.', route: '/official', durationMs: 5000, run: () => undefined },
  { title: 'Explain affected area and urgency', narration: 'Structured extraction: Demo Coastal District · HIGH · 18:30–22:30 · move to higher ground immediately.', route: '/official', durationMs: 5000, run: () => st().validateOfficialAlert('FLD-DEMO-001') },
  { title: 'Run Clarity Processor', narration: 'Plain language, side by side with the untouched original. Meaning Integrity: VERIFIED (rule-based demo).', route: '/clarity', durationMs: 5500, run: () => st().runPlain('FLD-DEMO-001') },
  { title: 'Generate Hindi / Odia versions', narration: 'Synthetic translations — labelled TRANSLATED DEMO CONTENT and re-checked for every core fact.', route: '/language', durationMs: 5500, run: () => { st().generateTranslations('FLD-DEMO-001', ['hi', 'or']); st().set('previewLanguage', 'or'); } },
  { title: 'Generate visual low-literacy version', narration: 'Icons + short phrases + voice. Same facts, far lower reading load.', route: '/visual', durationMs: 5500, run: () => { (['en', 'hi', 'or'] as const).forEach((l) => st().generateVisual('FLD-DEMO-001', l)); st().set('visualMode', 'lowLiteracy'); st().set('previewLanguage', 'hi'); } },
  { title: 'Switch network to 20%', narration: 'Connectivity degrades: high latency, simulated packet loss.', route: '/delivery', durationMs: 4000, run: () => st().set('networkQuality', 20) },
  { title: 'Start delivery simulation', narration: 'Each synthetic recipient gets a demo channel recommendation based on device and network.', route: '/delivery', durationMs: 4500, run: () => st().startDelivery('FLD-DEMO-001') },
  { title: 'Internet failure', narration: 'Simulated internet + cellular outage. Direct channels start failing.', route: '/delivery', durationMs: 4500, run: () => st().set('outage', true) },
  { title: 'Automatic switch to community relay', narration: 'Fallback Strategy Active: Internet → SMS → Community Relay → Offline Queue.', route: '/delivery', durationMs: 6000, run: () => st().fastForward(6) },
  { title: 'Deliver to several recipients', narration: 'Relay B comes back online and forwards its queue. Messages reach the last mile.', route: '/receipts', durationMs: 5500, run: deliverAll },
  { title: 'Show acknowledgement', narration: 'Receiving is not understanding: recipients confirm — one asks for help and is flagged.', route: '/receipts', durationMs: 5000, run: acknowledgeRemaining },
  { title: 'Final dashboard metrics', narration: 'Delivery, acknowledgement and channel analytics — all from the simulation.', route: '/analytics', durationMs: 5000, run: () => st().set('outage', false) },
  { title: 'Message lineage', narration: 'Every version traces back to the one official source.', route: '/pipeline', durationMs: 5500, run: () => undefined },
  { title: 'Meaning-preservation validation', narration: 'Hazard, severity, location, time and action retained in every version (deterministic demo checks).', route: '/pipeline', durationMs: 5500, run: () => st().log('Judge demo complete.', 'success') },
];

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
