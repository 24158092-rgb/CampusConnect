import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Copy, Cpu, Sparkles, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EntityLegend, HighlightedText, OriginalAlertPanel, ValidationChecklist } from '../components/alert';
import { ProvenanceTag } from '../components/badges';
import { PersonaPreview } from '../components/visual';
import { Button, PageHeader, Panel, SectionTitle, Toggle, cx } from '../components/ui';
import { PERSONAS } from '../data/network';
import { findTransformation, useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { EntityKind, PersonaId } from '../types';
import { copyText, DEMO_DISCLAIMER } from '../utils/export';
import { expectedFacts } from '../utils/validation';

const STEPS = ['Parsing official text', 'Extracting core facts', 'Simplifying wording', 'Verifying meaning'];

/** Reveals text progressively to show generation; instant when motion is reduced. */
function Typewriter({ text, children }: { text: string; children: (shown: string) => React.ReactNode }) {
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const [n, setN] = useState(reduced ? text.length : 0);
  useEffect(() => {
    if (reduced) {
      setN(text.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= text.length ? (window.clearInterval(id), v) : v + 4)), 16);
    return () => window.clearInterval(id);
  }, [text, reduced]);
  return <>{children(text.slice(0, n))}</>;
}

export default function Clarity() {
  const alert = useSelectedAlert();
  const transformations = useStore((s) => s.transformations);
  const injectOmission = useStore((s) => s.injectOmission);
  const targetPersonas = useStore((s) => s.targetPersonas);
  const activePersona = useStore((s) => s.activePersona);
  const { runPlain, set } = useStore.getState();
  const navigate = useNavigate();
  const plain = findTransformation(transformations, alert.id, 'plain', 'en');
  const [processing, setProcessing] = useState(-1);

  const run = () => {
    setProcessing(0);
    STEPS.forEach((_, i) => setTimeout(() => setProcessing(i + 1), (i + 1) * 380));
    setTimeout(() => {
      const t = runPlain(alert.id);
      setProcessing(-1);
      toast(t.validation.passed ? 'Plain-language version generated — Meaning Integrity: VERIFIED.' : '⚠ Content validation required — a core fact is missing.', t.validation.passed ? 'success' : 'error');
    }, STEPS.length * 380 + 200);
  };

  const tokens = expectedFacts(alert, 'en');
  const plainEntities: Partial<Record<EntityKind, string[]>> = {
    hazard: [...tokens.hazard, 'Flash flooding', 'cyclone', 'Extreme heat', 'heavy rain'],
    severity: tokens.severity,
    location: tokens.area,
    time: [...tokens.start, ...tokens.end],
    action: [...tokens.action, alert.localized.en?.doNot ?? alert.doNot, 'now'],
  };

  const togglePersona = (id: PersonaId) => {
    const next = targetPersonas.includes(id) ? targetPersonas.filter((p) => p !== id) : [...targetPersonas, id];
    set('targetPersonas', next);
    if (!next.includes(activePersona) && next[0]) set('activePersona', next[0]);
    if (!targetPersonas.includes(id)) set('activePersona', id);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 3 · Clarity Processor"
        title="Clarity Processor"
        description="Converts complex official wording into plain language without altering meaning, severity, affected area, time or recommended action. Rule-based templates — no facts are invented."
        actions={
          <>
            <Button variant="primary" icon={Cpu} onClick={run} disabled={processing >= 0}>
              {plain ? 'Re-run Clarity Processor' : 'Run Clarity Processor'}
            </Button>
            <Button icon={ArrowRight} onClick={() => navigate('/language')} disabled={!plain}>
              Translate
            </Button>
          </>
        }
      />

      <Panel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Toggle
          checked={injectOmission}
          onChange={(v) => {
            set('injectOmission', v);
            toast(v ? 'Test mode: the next run will drop the time line so you can see the validator catch it.' : 'Omission test disabled.', 'info');
          }}
          label="Validator test: inject an omission"
          description="Deliberately drops the time sentence on the next run to demonstrate ⚠ CONTENT VALIDATION REQUIRED."
        />
        <EntityLegend />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-ink-2 uppercase">Left · Original official alert</h2>
          <OriginalAlertPanel alert={alert} compact />
        </div>
        <div>
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-ink-2 uppercase">Right · Plain-language alert</h2>
          <div className="relative min-h-[16rem] rounded-2xl border border-info/60 bg-panel p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-info px-2.5 py-1 font-mono text-xs font-extrabold tracking-[0.18em] text-slate-950">PLAIN LANGUAGE VERSION</span>
              <ProvenanceTag kind="simplified" />
            </div>
            <AnimatePresence mode="wait">
              {processing >= 0 ? (
                <motion.ol key="proc" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4 space-y-2" aria-live="polite">
                  {STEPS.map((s, i) => (
                    <li key={s} className={cx('flex items-center gap-2 text-sm', i < processing ? 'text-ok' : i === processing ? 'text-info' : 'text-ink-3')}>
                      <span aria-hidden>{i < processing ? '✓' : i === processing ? '◌' : '○'}</span>
                      {s}
                      {i === processing && <span className="skeleton ml-2 inline-block h-3 w-24" />}
                    </li>
                  ))}
                </motion.ol>
              ) : plain ? (
                <motion.div key={plain.generatedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4">
                  <Typewriter text={plain.content}>
                    {(shown) => (
                      <p className="text-lg leading-relaxed whitespace-pre-line">
                        <HighlightedText text={shown} entities={plainEntities} />
                      </p>
                    )}
                  </Typewriter>
                  <p className="mt-3 text-xs text-ink-3">Version {plain.id} · parent {alert.id} · Simplified version — the official alert is the source of truth.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      icon={Copy}
                      onClick={async () => toast((await copyText(`${plain.content}\n\n[PLAIN LANGUAGE — simplified from official alert ${alert.id}] ${DEMO_DISCLAIMER}`)) ? 'Plain-language alert copied.' : 'Copy failed.', 'success')}
                    >
                      Copy plain-language alert
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="empty" className="mt-6 flex flex-col items-center gap-3 text-center text-ink-3">
                  <Sparkles aria-hidden className="size-10" />
                  <p>Run the Clarity Processor to generate the plain-language version.</p>
                  <Button variant="primary" icon={Cpu} onClick={run}>
                    Run Clarity Processor
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="mt-3 rounded-xl border border-line bg-panel/60 p-3 text-sm">
            <p className="font-semibold">Designed for:</p>
            <ul className="mt-1 grid list-disc gap-x-6 pl-5 text-ink-2 sm:grid-cols-2">
              <li>low-literacy users</li>
              <li>older adults</li>
              <li>first-time recipients</li>
              <li>people unfamiliar with emergency terminology</li>
            </ul>
          </div>
        </div>
      </div>

      {plain && <ValidationChecklist result={plain.validation} title="Meaning Preservation Check — core facts preserved" />}

      <Panel>
        <SectionTitle icon={Users}>Target User Selector</SectionTitle>
        <fieldset>
          <legend className="sr-only">Target audiences</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {PERSONAS.filter((p) => p.id !== 'localLanguage').map((p) => {
              const checked = targetPersonas.includes(p.id);
              return (
                <label key={p.id} className={cx('flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 transition', checked ? 'border-info bg-info/10' : 'border-line hover:border-info/50')}>
                  <input type="checkbox" checked={checked} onChange={() => togglePersona(p.id)} className="mt-1 size-5 accent-[var(--info)]" />
                  <span>
                    <span className="block text-sm font-bold">{p.label}</span>
                    <span className="block text-xs text-ink-3">{p.description}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        {targetPersonas.length > 0 && (
          <>
            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Preview for audience">
              {targetPersonas.map((id) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={activePersona === id}
                  onClick={() => set('activePersona', id)}
                  className={cx('min-h-10 rounded-lg border px-3 text-sm font-semibold', activePersona === id ? 'border-info bg-info text-slate-950' : 'border-line text-ink-2')}
                >
                  {PERSONAS.find((p) => p.id === id)?.label}
                </button>
              ))}
            </div>
            <div className="mt-4 max-w-2xl" role="tabpanel">
              <PersonaPreview alert={alert} persona={targetPersonas.includes(activePersona) ? activePersona : targetPersonas[0]} lang="en" />
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
