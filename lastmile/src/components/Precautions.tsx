import { ListChecks, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { HAZARD_LABEL } from '../data/languages';
import { PRECAUTIONS, type Precautions } from '../data/safety';
import type { HazardType } from '../types';
import { Segmented, cx } from './ui';

/** Recommended actions and precautions for a hazard — clearly separate from the official alert text. */
export function PrecautionsCard({ hazard, compact, className }: { hazard: HazardType; compact?: boolean; className?: string }) {
  const [phase, setPhase] = useState<keyof Omit<Precautions, 'immediate'>>('during');
  const p = PRECAUTIONS[hazard];
  return (
    <section className={cx('glass rounded-2xl p-5', className)} aria-labelledby={`prec-${hazard}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 id={`prec-${hazard}`} className="flex items-center gap-2 text-base">
          <ShieldAlert aria-hidden className="size-5 text-ok" />
          Immediate actions — {HAZARD_LABEL[hazard]}
        </h2>
        <span className="rounded-md border border-ok/50 bg-ok/10 px-2 py-0.5 text-[0.7rem] font-bold text-ok">SAFETY GUIDANCE · NOT PART OF THE OFFICIAL TEXT</span>
      </div>
      <ol className="mt-3 space-y-2">
        {p.immediate.slice(0, compact ? 4 : 5).map((a, i) => (
          <li key={a} className="flex items-start gap-3 rounded-lg bg-panel-2 p-3">
            <span className="grid size-7 shrink-0 place-items-center rounded-full bg-ok text-sm font-bold text-slate-950">{i + 1}</span>
            <span className="pt-0.5 font-bold">{a}</span>
          </li>
        ))}
      </ol>
      {!compact && (
        <div className="mt-4">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks aria-hidden className="size-4 text-ink-3" />
            <Segmented
              label="Precaution phase"
              value={phase}
              onChange={setPhase}
              options={[
                { value: 'before', label: 'Before' },
                { value: 'during', label: 'During' },
                { value: 'after', label: 'After' },
              ]}
            />
          </div>
          <ul className="list-disc space-y-1 pl-6 text-ink-2">
            {p[phase].map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
