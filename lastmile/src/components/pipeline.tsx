import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { STAGES, type StageDef } from '../data/stages';
import { usePipeline, type StageState } from '../hooks/usePipeline';
import { cx } from './ui';

const TONE: Record<StageDef['tone'], { text: string; ring: string; bg: string; glow: string }> = {
  cyan: { text: 'text-info', ring: 'border-info', bg: 'bg-info/10', glow: 'shadow-[0_0_28px_-4px_var(--info)]' },
  blue: { text: 'text-info-2', ring: 'border-info-2', bg: 'bg-info-2/10', glow: 'shadow-[0_0_28px_-4px_var(--info-2)]' },
  teal: { text: 'text-info', ring: 'border-info', bg: 'bg-info/10', glow: 'shadow-[0_0_28px_-4px_var(--info)]' },
  green: { text: 'text-ok', ring: 'border-ok', bg: 'bg-ok/10', glow: 'shadow-[0_0_28px_-4px_var(--ok)]' },
  amber: { text: 'text-amber', ring: 'border-amber', bg: 'bg-amber/10', glow: 'shadow-[0_0_28px_-4px_var(--amber)]' },
  orange: { text: 'text-warn', ring: 'border-warn', bg: 'bg-warn/10', glow: 'shadow-[0_0_28px_-4px_var(--warn)]' },
  red: { text: 'text-crit', ring: 'border-crit', bg: 'bg-crit/10', glow: 'shadow-[0_0_28px_-4px_var(--crit)]' },
};

export function PipelineNode({ stage, state, index, onClick, highlight }: { stage: StageDef; state: StageState; index: number; onClick: () => void; highlight?: boolean }) {
  const tone = TONE[stage.tone];
  const Icon = stage.icon;
  const glowing = state === 'active' || highlight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Stage ${index + 1}: ${stage.label} — ${state}. Open ${stage.module}.`}
      className={cx(
        'group relative flex w-36 shrink-0 flex-col items-center gap-2 rounded-xl border p-3 text-center transition hover:-translate-y-0.5 sm:w-40',
        state === 'pending' ? 'border-line bg-panel/60' : cx(tone.ring, tone.bg),
        glowing && tone.glow,
      )}
    >
      <span className={cx('relative grid size-12 place-items-center rounded-full border-2', state === 'pending' ? 'border-line text-ink-3' : cx(tone.ring, tone.text))}>
        <Icon aria-hidden className="size-6" />
        {glowing && <span aria-hidden className={cx('pulse-ring absolute inset-0 rounded-full', tone.text)} />}
        {state === 'complete' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -right-1 -bottom-1 grid size-5 place-items-center rounded-full bg-ok text-slate-950">
            <Check aria-hidden className="size-3.5" strokeWidth={3} />
          </motion.span>
        )}
      </span>
      <span className="font-mono text-[0.65rem] font-bold tracking-widest text-ink-3">STEP {index + 1}</span>
      <span className="text-sm leading-tight font-bold">{stage.label}</span>
      <span className="text-[0.7rem] leading-tight text-ink-3">{stage.module}</span>
      <span className={cx('rounded px-1.5 py-0.5 text-[0.65rem] font-bold uppercase', state === 'complete' ? 'bg-ok/15 text-ok' : state === 'active' ? cx(tone.bg, tone.text) : 'text-ink-3')}>
        {state === 'complete' ? '✓ Complete' : state === 'active' ? '● Active' : 'Pending'}
      </span>
    </button>
  );
}

export function PipelineConnector({ active, vertical }: { active: boolean; vertical?: boolean }) {
  return (
    <svg aria-hidden className={cx('shrink-0', vertical ? 'h-8 w-4' : 'h-4 w-8 self-center')} viewBox={vertical ? '0 0 16 32' : '0 0 32 16'}>
      <line
        x1={vertical ? 8 : 0}
        y1={vertical ? 0 : 8}
        x2={vertical ? 8 : 32}
        y2={vertical ? 32 : 8}
        stroke={active ? 'var(--info)' : 'var(--line)'}
        strokeWidth="2.5"
        className={active ? 'flow-line' : undefined}
      />
    </svg>
  );
}

/** Horizontal (scrollable on mobile) pipeline; each node opens its module. */
export function PipelineFlow({ alertId, highlightStage }: { alertId: string; highlightStage?: number }) {
  const { states } = usePipeline(alertId);
  const navigate = useNavigate();
  return (
    <nav aria-label="Alert processing pipeline" className="scrollbar-thin relative -mx-1 overflow-x-auto px-1 pb-2">
      <ol className="flex min-w-max items-stretch">
        {STAGES.map((s, i) => (
          <Fragment key={s.id}>
            <li className="flex">
              <PipelineNode stage={s} index={i} state={states[s.id]} highlight={highlightStage === i} onClick={() => navigate(s.route)} />
            </li>
            {i < STAGES.length - 1 && (
              <li aria-hidden className="flex">
                <PipelineConnector active={states[s.id] === 'complete'} />
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

/** Compact progress strip used in page headers so every module feels part of one system. */
export function PipelineStrip({ alertId }: { alertId: string }) {
  const { states } = usePipeline(alertId);
  const navigate = useNavigate();
  return (
    <ol aria-label="Pipeline progress" className="scrollbar-thin relative flex items-center gap-1 overflow-x-auto pb-1">
      {STAGES.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(s.route)}
            className={cx(
              'flex min-h-8 items-center gap-1 rounded-md border px-2 text-[0.7rem] font-bold whitespace-nowrap',
              states[s.id] === 'complete' ? 'border-ok/50 text-ok' : states[s.id] === 'active' ? 'border-info text-info' : 'border-line text-ink-3',
            )}
          >
            {states[s.id] === 'complete' ? <Check aria-hidden className="size-3" /> : <span aria-hidden>{i + 1}</span>}
            {s.short}
            <span className="sr-only"> — {states[s.id]}</span>
          </button>
          {i < STAGES.length - 1 && <span aria-hidden className="text-ink-3">›</span>}
        </li>
      ))}
    </ol>
  );
}
