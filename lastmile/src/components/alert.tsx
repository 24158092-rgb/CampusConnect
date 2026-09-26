import { motion } from 'framer-motion';
import { Building2, CalendarClock, Eye, Fingerprint, Lock, MapPin, ShieldCheck, TriangleAlert, Footprints } from 'lucide-react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import { HAZARD_LABEL } from '../data/languages';
import { HazardIcon } from './icons';
import { sourceById } from '../data/network';
import type { EmergencyAlert, EntityKind, ValidationResult } from '../types';
import { PROVENANCE, ProvenanceTag, SeverityBadge, SyntheticLabel, severityBorder } from './badges';
import { Button, Modal, cx } from './ui';

export const ENTITY_STYLE: Record<EntityKind, { cls: string; label: string }> = {
  hazard: { cls: 'bg-crit/20 text-rose-200 decoration-crit', label: 'Hazard' },
  location: { cls: 'bg-info/15 text-cyan-100 decoration-info', label: 'Location' },
  time: { cls: 'bg-amber/15 text-amber-100 decoration-amber', label: 'Time' },
  severity: { cls: 'bg-warn/20 text-orange-100 decoration-warn', label: 'Severity' },
  action: { cls: 'bg-ok/15 text-emerald-100 decoration-ok', label: 'Action' },
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Highlights entity phrases; each mark carries its kind as text for screen readers. */
export function HighlightedText({ text, entities, enabled = true }: { text: string; entities: Partial<Record<EntityKind, string[]>>; enabled?: boolean }) {
  const parts = useMemo(() => {
    const phrases = (Object.entries(entities) as [EntityKind, string[]][])
      .flatMap(([kind, list]) => list.filter(Boolean).map((p) => ({ kind, p })))
      .sort((a, b) => b.p.length - a.p.length);
    if (!enabled || !phrases.length) return [{ text, kind: null as EntityKind | null }];
    const re = new RegExp(`(${phrases.map((x) => escapeRe(x.p)).join('|')})`, 'gi');
    return text.split(re).map((chunk) => {
      const hit = phrases.find((x) => x.p.toLowerCase() === chunk.toLowerCase());
      return { text: chunk, kind: hit?.kind ?? null };
    });
  }, [text, entities, enabled]);

  return (
    <>
      {parts.map((part, i) =>
        part.kind ? (
          <mark key={i} className={cx('rounded px-0.5 underline decoration-2 underline-offset-4', ENTITY_STYLE[part.kind].cls)}>
            <span className="sr-only">[{ENTITY_STYLE[part.kind].label}] </span>
            {part.text}
          </mark>
        ) : (
          <Fragment key={i}>{part.text}</Fragment>
        ),
      )}
    </>
  );
}

export function EntityLegend() {
  return (
    <ul className="flex flex-wrap gap-2 text-xs" aria-label="Highlight legend">
      {(Object.keys(ENTITY_STYLE) as EntityKind[]).map((k) => (
        <li key={k} className={cx('rounded px-2 py-0.5 font-semibold underline decoration-2 underline-offset-4', ENTITY_STYLE[k].cls)}>
          {ENTITY_STYLE[k].label}
        </li>
      ))}
    </ul>
  );
}

export function AlertCard({ alert, selected, onSelect, children }: { alert: EmergencyAlert; selected?: boolean; onSelect?: () => void; children?: ReactNode }) {
  const src = sourceById(alert.source);
  return (
    <motion.article layout className={cx('glass flex flex-col gap-3 rounded-xl border-l-4 p-4 transition', severityBorder[alert.severity], selected && 'ring-2 ring-info')}>
      <div className="flex items-start gap-3">
        <HazardIcon type={alert.type} className="size-11 bg-panel-2 text-ink" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold">{HAZARD_LABEL[alert.type]}</h3>
            <SeverityBadge severity={alert.severity} />
          </div>
          <p className="mt-0.5 font-mono text-xs text-ink-3">
            {alert.id} · {src.shortName} · {alert.issuedAt}–{alert.validUntil}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-2">
            <MapPin aria-hidden className="size-3.5" /> {alert.affectedArea}
          </p>
        </div>
      </div>
      <SyntheticLabel userCreated={alert.demoStatus === 'SYNTHETIC_USER_CREATED'} className="self-start" />
      {onSelect && (
        <Button size="sm" variant={selected ? 'primary' : 'secondary'} onClick={onSelect} aria-pressed={selected}>
          {selected ? 'Selected' : 'Select alert'}
        </Button>
      )}
      {children}
    </motion.article>
  );
}

function Field({ label, icon: Icon, children, mono }: { label: string; icon: typeof MapPin; children: ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2/60 p-3">
      <dt className="flex items-center gap-1.5 font-mono text-[0.68rem] font-bold tracking-widest text-ink-3 uppercase">
        <Icon aria-hidden className="size-3.5" />
        {label}
      </dt>
      <dd className={cx('mt-1 font-semibold', mono && 'font-mono')}>{children}</dd>
    </div>
  );
}

/** The immutable source of truth. Rendered read-only everywhere. */
export function OriginalAlertPanel({ alert, highlight = true, compact }: { alert: EmergencyAlert; highlight?: boolean; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const src = sourceById(alert.source);
  return (
    <article aria-label={`Official alert ${alert.id}`} className={cx('relative overflow-hidden rounded-2xl bg-panel p-4 sm:p-5', PROVENANCE.official.card)}>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-24 size-56 rounded-full bg-info-2/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center gap-2">
        <span className="rounded-md bg-info-2 px-2.5 py-1 font-mono text-xs font-extrabold tracking-[0.18em] text-slate-950">OFFICIAL ALERT</span>
        <ProvenanceTag kind="official" />
        <span className="inline-flex items-center gap-1 text-xs text-ink-3">
          <Lock aria-hidden className="size-3.5" /> Immutable
        </span>
      </div>
      <div className="relative mt-2">
        <SyntheticLabel userCreated={alert.demoStatus === 'SYNTHETIC_USER_CREATED'} />
      </div>
      {!compact && (
        <dl className="relative mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Field label="Alert ID" icon={Fingerprint} mono>
            {alert.id}
          </Field>
          <Field label="Event" icon={TriangleAlert}>
            {HAZARD_LABEL[alert.type].toUpperCase()}
          </Field>
          <Field label="Severity" icon={ShieldCheck}>
            <SeverityBadge severity={alert.severity} />
          </Field>
          <Field label="Source" icon={Building2}>
            <span className="text-sm">{src.name}</span>
          </Field>
          <Field label="Affected area" icon={MapPin}>
            {alert.affectedArea}
          </Field>
          <Field label="Issued" icon={CalendarClock} mono>
            {alert.issuedAt}
          </Field>
          <Field label="Valid until" icon={CalendarClock} mono>
            {alert.validUntil}
          </Field>
          <Field label="Recommended action" icon={Footprints}>
            <span className="text-sm">{alert.recommendedAction}</span>
          </Field>
        </dl>
      )}
      <div className="relative mt-4">
        <p className="mb-1.5 font-mono text-[0.68rem] font-bold tracking-widest text-ink-3 uppercase">Original message — exactly as received</p>
        <blockquote className="rounded-lg border-l-4 border-info-2 bg-black/30 p-3 text-[0.95rem] leading-relaxed text-ink select-text">
          <HighlightedText text={alert.originalMessage} entities={alert.entities} enabled={highlight} />
        </blockquote>
      </div>
      <div className="relative mt-3 flex flex-wrap gap-2">
        <Button size="sm" icon={Eye} onClick={() => setOpen(true)}>
          View Original
        </Button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title={`Original official text — ${alert.id}`}>
        <SyntheticLabel userCreated={alert.demoStatus === 'SYNTHETIC_USER_CREATED'} />
        <p className="mt-3 text-xs text-ink-3">Unformatted, unhighlighted source text. This content is never edited by LASTMILE.</p>
        <pre className="mt-2 rounded-lg border border-line bg-black/40 p-4 font-mono text-sm whitespace-pre-wrap">{alert.originalMessage}</pre>
        <pre className="relative mt-3 overflow-x-auto rounded-lg border border-line bg-black/40 p-4 font-mono text-xs text-ink-2">
          {JSON.stringify(
            { id: alert.id, type: alert.type, severity: alert.severity, source: src.name, issuedAt: alert.issuedAt, validUntil: alert.validUntil, affectedArea: alert.affectedArea, recommendedAction: alert.recommendedAction, demoStatus: alert.demoStatus },
            null,
            2,
          )}
        </pre>
      </Modal>
    </article>
  );
}

export function ValidationChecklist({ result, title = 'Meaning Preservation Check', compact }: { result: ValidationResult; title?: string; compact?: boolean }) {
  return (
    <div className={cx('rounded-xl border p-4', result.passed ? 'border-ok/50 bg-ok/5' : 'border-crit/70 bg-crit/10')} aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs font-bold tracking-widest text-ink-2 uppercase">{title}</p>
        {result.passed ? (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-ok px-2 py-0.5 text-xs font-extrabold text-slate-950">
            <ShieldCheck aria-hidden className="size-4" /> MEANING INTEGRITY: VERIFIED
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-md bg-crit px-2 py-0.5 text-xs font-extrabold text-white">
            <TriangleAlert aria-hidden className="size-4" /> ⚠ CONTENT VALIDATION REQUIRED
          </span>
        )}
      </div>
      <ul className={cx('mt-3 grid gap-1.5', compact ? 'grid-cols-2' : 'sm:grid-cols-2')}>
        {result.checks.map((c) => (
          <li key={c.key} className={cx('flex items-start gap-2 text-sm', c.passed ? 'text-ink' : 'font-semibold text-crit')}>
            <span aria-hidden className={cx('mt-0.5 grid size-5 shrink-0 place-items-center rounded text-xs font-black', c.passed ? 'bg-ok text-slate-950' : 'bg-crit text-white')}>
              {c.passed ? '✓' : '!'}
            </span>
            <span>
              {c.passed ? c.label : c.label.replace('retained', 'MISSING')}
              {!compact && <span className="block truncate font-mono text-[0.7rem] text-ink-3">expects: {c.expected.join(' | ')}</span>}
            </span>
          </li>
        ))}
      </ul>
      {result.untranslated.length > 0 && (
        <p className="mt-3 rounded-md border border-amber/50 bg-amber/10 p-2 text-xs text-amber">
          Partial translation: {result.untranslated.join(', ')} kept in the official English wording (no phrase-bank entry — never machine-invented).
        </p>
      )}
      <p className="mt-3 text-[0.7rem] text-ink-3">Deterministic rule-based demo check against the structured official fields — not an AI score and not a certified semantic guarantee.</p>
    </div>
  );
}
