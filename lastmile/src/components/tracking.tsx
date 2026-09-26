import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Activity, CircleCheck, Info, OctagonAlert, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { languageInfo } from '../data/languages';
import { CHANNEL_LABEL, personaById } from '../data/network';
import { useStore } from '../store/useStore';
import type { DeliveryRecord, LogKind } from '../types';
import { clock } from '../utils/time';
import { StatusBadge } from './badges';
import { cx } from './ui';

/** Counter that eases toward its target value. */
export function useCountUp(value: number, reduced: boolean) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      setShown(Math.round(a + (value - a) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = value;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduced]);
  return shown;
}

export function MetricCard({ label, value, suffix, icon: Icon, tone = 'info', hint }: { label: string; value: number; suffix?: string; icon: LucideIcon; tone?: 'info' | 'ok' | 'warn' | 'crit' | 'violet'; hint?: string }) {
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const shown = useCountUp(value, reduced);
  const color = { info: 'text-info', ok: 'text-ok', warn: 'text-warn', crit: 'text-crit', violet: 'text-violet' }[tone];
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-ink-2 uppercase">{label}</p>
        <Icon aria-hidden className={cx('size-5', color)} />
      </div>
      <p className="mt-2 font-mono text-3xl font-bold tabular-nums">
        {shown}
        {suffix && <span className="ml-0.5 text-lg text-ink-2">{suffix}</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

const LOG_ICON: Record<LogKind, { icon: LucideIcon; cls: string }> = {
  info: { icon: Info, cls: 'text-info' },
  success: { icon: CircleCheck, cls: 'text-ok' },
  warning: { icon: TriangleAlert, cls: 'text-warn' },
  error: { icon: OctagonAlert, cls: 'text-crit' },
};

export function ActivityFeed({ limit = 12, className }: { limit?: number; className?: string }) {
  const activity = useStore((s) => s.activity);
  const items = activity.slice(0, limit);
  return (
    <div className={className}>
      <h2 className="mb-3 flex items-center gap-2 font-bold">
        <Activity aria-hidden className="size-5 text-info" /> Activity / Audit Log
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-ok">
          <span aria-hidden className="size-2 animate-pulse rounded-full bg-ok" /> LIVE
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line p-4 text-sm text-ink-3">No activity yet. Launch the demo or process an alert to see the audit trail.</p>
      ) : (
        <ol className="scrollbar-thin max-h-96 space-y-1 overflow-y-auto pr-1" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {items.map((e) => {
              const I = LOG_ICON[e.kind];
              return (
                <motion.li key={e.id} layout initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-panel-2/60">
                  <time className="shrink-0 font-mono text-xs text-ink-3" dateTime={new Date(e.time).toISOString()}>
                    {clock(e.time)}
                  </time>
                  <I.icon aria-hidden className={cx('mt-0.5 size-4 shrink-0', I.cls)} />
                  <span className="text-ink-2">{e.message}</span>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  );
}

export function ReceiptTable({ records, onSelect, selectedId }: { records: DeliveryRecord[]; onSelect?: (r: DeliveryRecord) => void; selectedId?: string }) {
  return (
    <>
      {/* Desktop / tablet table */}
      <div className="scrollbar-thin relative hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] text-left text-sm">
          <caption className="sr-only">Simulated delivery and acknowledgement status per synthetic recipient</caption>
          <thead className="font-mono text-[0.68rem] tracking-widest text-ink-3 uppercase">
            <tr className="border-b border-line">
              {['Recipient', 'Language', 'Format', 'Communication Mode', 'Status', 'Last Update', 'Acknowledgement'].map((h) => (
                <th key={h} scope="col" className="px-3 py-2 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr
                key={r.id}
                onClick={() => onSelect?.(r)}
                className={cx('cursor-pointer border-b border-line/60 transition hover:bg-panel-2/70', selectedId === r.id && 'bg-info/10')}
              >
                <td className="px-3 py-2.5">
                  <button type="button" onClick={() => onSelect?.(r)} className="text-left font-semibold hover:text-info">
                    {r.recipient.name}
                  </button>
                  <span className="block text-xs text-ink-3">{personaById(r.recipient.persona).label}</span>
                </td>
                <td className="px-3 py-2.5">{languageInfo(r.language).name}</td>
                <td className="px-3 py-2.5">{r.format}</td>
                <td className="px-3 py-2.5">
                  {CHANNEL_LABEL[r.channel]}
                  {r.channelHistory.length > 1 && <span className="block text-[0.7rem] text-warn">↳ via fallback ({r.channelHistory.length - 1})</span>}
                  {r.retryCount > 0 && <span className="block text-[0.7rem] text-ink-3">retries: {r.retryCount}</span>}
                </td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={r.status} />
                  {r.status === 'IN_TRANSIT' && (
                    <span className="mt-1 block h-1 w-20 overflow-hidden rounded bg-panel-2">
                      <span className="block h-full bg-info transition-all" style={{ width: `${r.progress}%` }} />
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs text-ink-2">{clock(r.timestamp)}</td>
                <td className="px-3 py-2.5">
                  {r.acknowledged === 'needHelp' ? (
                    <span className="font-bold text-crit">⚑ Needs help</span>
                  ) : r.acknowledged ? (
                    <span className="font-bold text-ok">✓ {r.acknowledged === 'understood' ? 'Understood' : 'Received'}</span>
                  ) : (
                    <span className="text-ink-3">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {records.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => onSelect?.(r)} className={cx('w-full rounded-xl border border-line bg-panel-2/60 p-3 text-left', selectedId === r.id && 'ring-2 ring-info')}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold">{r.recipient.name}</span>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-1 text-sm text-ink-2">
                {languageInfo(r.language).name} · {r.format} · {CHANNEL_LABEL[r.channel]}
              </p>
              <p className="mt-0.5 text-xs text-ink-3">
                {personaById(r.recipient.persona).label} · {clock(r.timestamp)}
                {r.acknowledged && ` · ${r.acknowledged === 'needHelp' ? '⚑ Needs help' : '✓ Acknowledged'}`}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}

export function DeliveryTimeline({ record }: { record: DeliveryRecord }) {
  const steps = [
    { label: 'Queued', done: true },
    ...record.channelHistory.map((c, i) => ({ label: `${i === 0 ? 'Sent via' : 'Fallback →'} ${CHANNEL_LABEL[c]}`, done: true })),
    { label: `Delivered${record.hops ? ` (${record.hops} hops, ${record.simSeconds.toFixed(1)} s simulated)` : ''}`, done: ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(record.status) },
    { label: record.acknowledged === 'needHelp' ? 'Needs help — flagged' : 'Acknowledged', done: Boolean(record.acknowledged) },
  ];
  return (
    <ol className="relative space-y-3 border-l-2 border-line pl-5" aria-label={`Delivery timeline for ${record.recipient.name}`}>
      {steps.map((s, i) => (
        <li key={i} className="relative text-sm">
          <span aria-hidden className={cx('absolute top-1 -left-[1.72rem] size-3 rounded-full border-2', s.done ? 'border-ok bg-ok' : 'border-line bg-panel')} />
          <span className={s.done ? 'text-ink' : 'text-ink-3'}>{s.label}</span>
        </li>
      ))}
    </ol>
  );
}
