import { AnimatePresence, motion } from 'framer-motion';
import { Accessibility, CircleCheck, Pause, Play, RotateCcw, SkipForward, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEMO_SCRIPTS, goToDemoStep, launchDemo } from '../data/demoScript';
import { LANGUAGES } from '../data/languages';
import { STAGES } from '../data/stages';
import { useStore } from '../store/useStore';
import type { TextSize } from '../types';
import { pct } from '../utils/time';
import { Button, ProgressBar, Segmented, cx } from './ui';

export function AccessibilityControls() {
  const a11y = useStore((s) => s.a11y);
  const setA11y = useStore((s) => s.setA11y);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="a11y-panel"
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-panel-2 px-4 text-sm font-medium hover:border-accent"
      >
        <Accessibility aria-hidden className="size-5 text-info" />
        <span className="hidden sm:inline">Accessibility</span>
        <span className="sr-only sm:hidden">Accessibility settings</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="a11y-panel"
            role="dialog"
            aria-label="Accessibility settings"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="glass absolute right-0 z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] space-y-4 rounded-xl p-4 shadow-2xl"
          >
            <div>
              <p className="mb-1.5 text-sm font-bold">Text size</p>
              <Segmented<TextSize>
                label="Text size"
                value={a11y.textSize}
                onChange={(v) => setA11y({ textSize: v })}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'large', label: 'Large' },
                  { value: 'xlarge', label: 'Extra Large' },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold">Motion</p>
              <Segmented
                label="Motion"
                value={a11y.reducedMotion ? 'reduced' : 'normal'}
                onChange={(v) => setA11y({ reducedMotion: v === 'reduced' })}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'reduced', label: 'Reduced' },
                ]}
              />
            </div>
            <div>
              <p className="mb-1.5 text-sm font-bold">Contrast</p>
              <Segmented
                label="Contrast"
                value={a11y.highContrast ? 'high' : 'standard'}
                onChange={(v) => setA11y({ highContrast: v === 'high' })}
                options={[
                  { value: 'standard', label: 'Standard' },
                  { value: 'high', label: 'High Contrast' },
                ]}
              />
            </div>
            <p className="text-xs text-ink-3">Settings are saved on this device. OS “reduce motion” is also respected.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Applies accessibility preferences to the root element. */
export function useApplyA11y() {
  const a11y = useStore((s) => s.a11y);
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('text-large', a11y.textSize === 'large');
    root.classList.toggle('text-xlarge', a11y.textSize === 'xlarge');
    root.classList.toggle('hc', a11y.highContrast);
    root.classList.toggle('reduce-motion', a11y.reducedMotion);
  }, [a11y]);
}

export function SystemStatusPanel({ compact }: { compact?: boolean }) {
  const nodes = useStore((s) => s.nodes);
  const translationOutage = useStore((s) => s.translationOutage);
  const simRunning = useStore((s) => s.simRunning);
  const outage = useStore((s) => s.outage);
  const relayDegraded = nodes.some((n) => n.status !== 'online' && n.kind !== 'cluster');
  const rows = [
    { name: 'Alert Processing', ok: true, text: 'OPERATIONAL' },
    { name: 'Translation Engine', ok: !translationOutage, text: translationOutage ? 'OUTAGE (SIM)' : 'OPERATIONAL' },
    { name: 'Visual Studio', ok: true, text: 'OPERATIONAL' },
    { name: 'Delivery Simulator', ok: !outage, text: outage ? 'NETWORK OUTAGE (SIM)' : simRunning ? 'SIMULATING' : 'OPERATIONAL' },
    { name: 'Receipt Tracker', ok: true, text: 'OPERATIONAL' },
    { name: 'Relay Network', ok: !relayDegraded, text: relayDegraded ? 'DEGRADED' : 'OPERATIONAL' },
  ];
  if (compact) {
    const issues = rows.filter((r) => !r.ok);
    return (
      <div>
        <p className="label-caps mb-2">System status</p>
        <ul className="flex gap-1.5" aria-label={rows.map((r) => `${r.name}: ${r.text}`).join('; ')}>
          {rows.map((r) => (
            <li key={r.name} title={`${r.name}: ${r.text}`} className={cx('h-1.5 flex-1 rounded-full', r.ok ? 'bg-ok/70' : 'bg-warn')} />
          ))}
        </ul>
        <p className={cx('mt-2 text-xs', issues.length ? 'text-warn' : 'text-ink-2')}>
          {issues.length ? `⚠ ${issues.map((r) => `${r.name} ${r.text.toLowerCase()}`).join(', ')}` : `${rows.length}/${rows.length} operational`}
        </p>
      </div>
    );
  }
  return (
    <div>
      <h2 className="label-caps mb-3">System Status</h2>
      <ul className="space-y-1.5">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-2">
              <span aria-hidden className={cx('size-2 rounded-full', r.ok ? 'bg-ok' : 'pulse-ring bg-warn text-warn')} />
              {r.name}
            </span>
            <span className={cx('shrink-0 font-mono text-[0.6rem] font-bold', r.ok ? 'text-ok' : 'text-warn')}>
              {r.ok ? '' : '⚠ '}
              {r.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function useSessionSummary() {
  const deliveries = useStore((s) => s.deliveries);
  const alertId = useStore((s) => s.selectedAlertId);
  const transformations = useStore((s) => s.transformations);
  return useMemo(() => {
    const recs = deliveries.filter((d) => d.alertId === alertId);
    const delivered = recs.filter((d) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status)).length;
    const acked = recs.filter((d) => d.acknowledged && d.acknowledged !== 'needHelp').length;
    const help = recs.filter((d) => d.acknowledged === 'needHelp').length;
    const ts = transformations.filter((t) => t.alertId === alertId);
    return {
      total: recs.length,
      delivered,
      acked,
      help,
      languages: new Set(ts.filter((t) => t.type === 'translation').map((t) => t.language)).size + 1,
      formats: ts.filter((t) => t.type === 'visual' || t.type === 'sms').length + 1,
      channels: new Set(recs.flatMap((r) => r.channelHistory)).size,
      rerouted: recs.filter((r) => r.channelHistory.length > 1).length,
    };
  }, [deliveries, alertId, transformations]);
}

/** Floating controller for the automated Full Demo and Judge Demo. */
export function DemoModeController() {
  const demo = useStore((s) => s.demo);
  const setDemo = useStore((s) => s.setDemo);
  const navigate = useNavigate();
  const summary = useSessionSummary();
  const steps = demo.mode ? DEMO_SCRIPTS[demo.mode] : [];
  const step = steps[demo.step];

  useEffect(() => {
    if (!demo.mode || !step || demo.finished) return;
    navigate(step.route);
  }, [demo.mode, demo.step, demo.finished, step, navigate]);

  useEffect(() => {
    if (!demo.mode || demo.paused || demo.finished || !step) return;
    const id = window.setTimeout(() => {
      if (demo.step >= steps.length - 1) setDemo({ finished: true });
      else goToDemoStep(demo.mode!, demo.step + 1);
    }, step.durationMs);
    return () => window.clearTimeout(id);
  }, [demo.mode, demo.step, demo.paused, demo.finished, step, steps.length, setDemo]);

  if (!demo.mode) return null;
  const exit = () => setDemo({ mode: null, finished: false, paused: false });

  return (
    <>
      <AnimatePresence>
        {!demo.finished && step && (
          <motion.aside
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            aria-label="Demo controller"
            className="glass fixed inset-x-2 bottom-20 z-40 rounded-2xl border-info/50 p-3 lg:right-6 lg:bottom-6 lg:left-auto lg:w-[30rem]"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-mono text-[0.7rem] font-bold tracking-widest text-info uppercase">
                {demo.mode === 'judge' ? 'Judge Demo' : 'Complete Emergency Demo'} · Step {demo.step + 1}/{steps.length}
              </p>
              <button type="button" onClick={exit} aria-label="Exit demo" className="grid size-9 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-ink">
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <div aria-live="polite">
              <p className="mt-1 font-bold">{step.title}</p>
              <p className="mt-0.5 text-sm text-ink-2">{step.narration}</p>
            </div>
            <div className="mt-3">
              <ProgressBar value={((demo.step + 1) / steps.length) * 100} label="Demo progress" />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {demo.paused ? (
                <Button size="sm" variant="primary" icon={Play} onClick={() => setDemo({ paused: false })}>
                  Resume
                </Button>
              ) : (
                <Button size="sm" icon={Pause} onClick={() => setDemo({ paused: true })}>
                  Pause
                </Button>
              )}
              <Button size="sm" icon={SkipForward} onClick={() => (demo.step >= steps.length - 1 ? setDemo({ finished: true }) : goToDemoStep(demo.mode!, demo.step + 1))}>
                Next
              </Button>
              <Button size="sm" icon={RotateCcw} onClick={() => launchDemo(demo.mode!)}>
                Restart
              </Button>
              <label className="sr-only" htmlFor="demo-skip">
                Skip to step
              </label>
              <select
                id="demo-skip"
                value={demo.step}
                onChange={(e) => goToDemoStep(demo.mode!, Number(e.target.value))}
                className="min-h-9 max-w-[11rem] flex-1 rounded-lg border border-line bg-panel-2 px-2 text-sm"
              >
                {steps.map((s, i) => (
                  <option key={s.title} value={i}>
                    {i + 1}. {s.title}
                  </option>
                ))}
              </select>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {demo.finished && (
          <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-done-title"
              initial={{ scale: 0.92, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="glass w-full max-w-2xl rounded-2xl border-ok/60 p-6 text-center"
            >
              <CircleCheck aria-hidden className="mx-auto size-14 text-ok" />
              {demo.mode === 'judge' ? (
                <h2 id="demo-done-title" className="mt-3 font-display text-3xl leading-tight font-medium tracking-tight sm:text-5xl">
                  ONE ALERT.
                  <br />
                  <span className="text-info">MULTIPLE FORMATS.</span>
                  <br />
                  <span className="text-ok">MULTIPLE LANGUAGES.</span>
                  <br />
                  <span className="text-warn">MULTIPLE CHANNELS.</span>
                  <br />
                  ONE SOURCE OF TRUTH.
                </h2>
              ) : (
                <h2 id="demo-done-title" className="mt-3 font-display text-3xl font-medium tracking-tight sm:text-4xl">
                  ALERT SUCCESSFULLY REACHED THE LAST MILE
                </h2>
              )}
              <p className="mt-2 text-sm text-ink-3">Simulation summary — synthetic data, no real messages were sent.</p>
              <dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Reached', `${summary.delivered}/${summary.total}`],
                  ['Acknowledged', `${pct(summary.acked, summary.total)}%`],
                  ['Needs help', String(summary.help)],
                  ['Languages', String(summary.languages)],
                  ['Formats generated', String(summary.formats)],
                  ['Channels used', String(summary.channels)],
                  ['Rerouted by fallback', String(summary.rerouted)],
                  ['Pipeline stages', `${STAGES.length}/${STAGES.length}`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-panel-2 p-3">
                    <dt className="text-[0.7rem] font-semibold tracking-wide text-ink-3 uppercase">{k}</dt>
                    <dd className="mt-1 font-mono text-xl font-bold">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-ink-3">Languages in this demo bank: {LANGUAGES.map((l) => l.name).join(', ')}.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button variant="primary" icon={RotateCcw} onClick={() => launchDemo(demo.mode!)}>
                  Replay demo
                </Button>
                <Button onClick={() => { exit(); navigate('/pipeline'); }}>View lineage</Button>
                <Button onClick={() => { exit(); navigate('/'); }}>Close</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
