import type { LucideIcon } from 'lucide-react';
import {
  Ban,
  Bot,
  CircleCheck,
  Clock,
  FlaskConical,
  HandHelping,
  Hourglass,
  Info,
  Languages,
  OctagonAlert,
  RefreshCw,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  TriangleAlert,
  Users,
} from 'lucide-react';
import type { ContentKind, DeliveryStatus, Severity } from '../types';
import { cx } from './ui';

const SEVERITY: Record<Severity, { icon: LucideIcon; cls: string; text: string }> = {
  INFO: { icon: Info, cls: 'border-info text-info bg-info/10', text: 'Info' },
  WARNING: { icon: TriangleAlert, cls: 'border-amber text-amber bg-amber/10', text: 'Warning' },
  HIGH: { icon: Siren, cls: 'border-warn text-warn bg-warn/10 border-2', text: 'High' },
  CRITICAL: { icon: OctagonAlert, cls: 'border-crit text-crit bg-crit/15 border-2 pulse-ring', text: 'Critical' },
};

/** Severity is always conveyed by icon + text + border, never colour alone. */
export function SeverityBadge({ severity, large }: { severity: Severity; large?: boolean }) {
  const s = SEVERITY[severity];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border font-mono font-extrabold tracking-wider uppercase', large ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs', s.cls)}>
      <s.icon aria-hidden className={large ? 'size-4' : 'size-3.5'} />
      <span>
        <span className="sr-only">Severity: </span>
        {severity}
      </span>
    </span>
  );
}

export const severityBorder: Record<Severity, string> = {
  INFO: 'border-info/70',
  WARNING: 'border-amber/70',
  HIGH: 'border-warn',
  CRITICAL: 'border-crit',
};

export const PROVENANCE: Record<ContentKind, { label: string; icon: LucideIcon; cls: string; card: string }> = {
  official: { label: 'Official source content', icon: ShieldCheck, cls: 'border-info-2 text-info-2 bg-info-2/10', card: 'border-2 border-info-2/70' },
  simplified: { label: 'Plain language · simplified', icon: Sparkles, cls: 'border-info text-info bg-info/10', card: 'border border-info/50' },
  translated: { label: 'Translated demo content', icon: Languages, cls: 'border-ok text-ok bg-ok/10', card: 'border border-ok/50' },
  generated: { label: 'Machine-generated · demo templates', icon: Bot, cls: 'border-violet text-violet bg-violet/10', card: 'border border-violet/50' },
  community: { label: 'Community-generated — not part of the official alert', icon: Users, cls: 'border-pink text-pink bg-pink/10', card: 'border-2 border-dashed border-pink/70' },
  simulated: { label: 'Simulated delivery', icon: FlaskConical, cls: 'border-warn text-warn bg-warn/10', card: 'border border-dotted border-warn/70' },
};

export function ProvenanceTag({ kind, label }: { kind: ContentKind; label?: string }) {
  const p = PROVENANCE[kind];
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[0.68rem] font-bold tracking-wider uppercase', p.cls)}>
      <p.icon aria-hidden className="size-3.5" />
      {label ?? p.label}
    </span>
  );
}

export const STATUS: Record<DeliveryStatus, { icon: LucideIcon; cls: string; label: string }> = {
  QUEUED: { icon: Hourglass, cls: 'border-ink-3 text-ink-2', label: 'Queued' },
  IN_TRANSIT: { icon: Send, cls: 'border-info text-info', label: 'In transit' },
  DELIVERED: { icon: CircleCheck, cls: 'border-ok text-ok', label: 'Delivered' },
  ACKNOWLEDGED: { icon: CircleCheck, cls: 'border-ok text-slate-950 bg-ok', label: 'Acknowledged' },
  NEEDS_HELP: { icon: HandHelping, cls: 'border-crit text-white bg-crit', label: 'Needs help' },
  FAILED: { icon: Ban, cls: 'border-crit text-crit', label: 'Failed' },
  RETRYING: { icon: RefreshCw, cls: 'border-warn text-warn', label: 'Retrying' },
};

export function StatusBadge({ status }: { status: DeliveryStatus }) {
  const s = STATUS[status];
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold whitespace-nowrap uppercase', s.cls)}>
      <s.icon aria-hidden className={cx('size-3.5', status === 'RETRYING' && 'animate-spin')} />
      {s.label}
    </span>
  );
}

export function SyntheticLabel({ userCreated, className }: { userCreated?: boolean; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5 rounded-md border border-amber bg-amber/15 px-2 py-0.5 font-mono text-[0.68rem] font-extrabold tracking-wider text-amber uppercase', className)}>
      <FlaskConical aria-hidden className="size-3.5" />
      {userCreated ? 'Synthetic user-created alert' : 'Synthetic demo data — not a real emergency alert'}
    </span>
  );
}

export function TimeChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <Clock aria-hidden className="size-3.5 text-ink-3" />
      {children}
    </span>
  );
}
