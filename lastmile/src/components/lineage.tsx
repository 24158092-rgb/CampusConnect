import { Lock, TriangleAlert, Trash2, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { HAZARD_LABEL, languageInfo } from '../data/languages';
import { sourceById } from '../data/network';
import { findTransformation, useStore } from '../store/useStore';
import type { AlertTransformation, ContentKind, EmergencyAlert, LanguageCode } from '../types';
import { clock } from '../utils/time';
import { validateOfficial } from '../utils/validation';
import { ProvenanceTag, SeverityBadge } from './badges';
import { Button, cx } from './ui';

interface LineageRow {
  stage: string;
  versionId: string;
  timestamp: string;
  kind: ContentKind;
  source: string;
  status: 'ok' | 'warn' | 'missing' | 'info';
  statusText: string;
}

function rowFor(stage: string, t: AlertTransformation | undefined, source: string): LineageRow {
  if (!t) return { stage, versionId: '—', timestamp: '—', kind: 'generated', source, status: 'missing', statusText: 'Not generated yet' };
  return {
    stage,
    versionId: t.id,
    timestamp: clock(t.generatedAt),
    kind: t.sourceType,
    source,
    status: t.validation.passed ? 'ok' : 'warn',
    statusText: t.validation.passed ? `Facts verified (${t.validation.checks.length}/${t.validation.checks.length})` : '⚠ CONTENT VALIDATION REQUIRED',
  };
}

export function LineageGraph({ alert, lang }: { alert: EmergencyAlert; lang: LanguageCode }) {
  const transformations = useStore((s) => s.transformations);
  const deliveries = useStore((s) => s.deliveries);
  const validatedAt = useStore((s) => s.validatedAt[alert.id]);
  const get = (type: AlertTransformation['type'], l: LanguageCode) => findTransformation(transformations, alert.id, type, l);
  const official = validateOfficial(alert);
  const recs = deliveries.filter((d) => d.alertId === alert.id && d.language === lang);
  const delivered = recs.filter((d) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status)).length;
  const acked = recs.filter((d) => d.acknowledged).length;
  const name = languageInfo(lang).name;

  const rows: LineageRow[] = [
    {
      stage: 'Official Alert',
      versionId: `${alert.id}-SRC`,
      timestamp: validatedAt ? clock(validatedAt) : alert.issuedAt,
      kind: 'official',
      source: sourceById(alert.source).name,
      status: official.passed ? 'ok' : 'warn',
      statusText: official.passed ? 'Immutable source · fields validated' : 'Immutable · some fields not restated in text',
    },
    rowFor('Plain Language', get('plain', 'en'), 'Clarity Processor'),
    ...(lang === 'en' ? [] : [rowFor(`${name} Translation`, get('translation', lang), 'Language Bank')]),
    rowFor(`Visual Version (${name})`, get('visual', lang), 'Visual Studio'),
    rowFor(`SMS Package (${name})`, get('sms', lang), 'Delivery Simulator'),
    {
      stage: 'Simulated Delivery',
      versionId: recs.length ? `${alert.id}-DLV-${lang.toUpperCase()}` : '—',
      timestamp: recs.length ? clock(Math.max(...recs.map((r) => r.timestamp))) : '—',
      kind: 'simulated',
      source: 'Delivery Simulator',
      status: recs.length ? 'info' : 'missing',
      statusText: recs.length ? `${delivered}/${recs.length} recipients reached` : 'Not started',
    },
    {
      stage: 'Acknowledgement',
      versionId: acked ? `${alert.id}-ACK-${lang.toUpperCase()}` : '—',
      timestamp: acked ? clock(Math.max(...recs.filter((r) => r.acknowledged).map((r) => r.timestamp))) : '—',
      kind: 'simulated',
      source: 'Receipt Tracker',
      status: acked ? 'ok' : 'missing',
      statusText: acked ? `${acked} acknowledged` : 'Awaiting responses',
    },
  ];

  return (
    <ol className="relative space-y-0" aria-label={`Message lineage for ${alert.id}, ${name} path`}>
      {rows.map((r, i) => (
        <li key={r.stage} className="relative flex gap-3 pb-4 last:pb-0">
          {i < rows.length - 1 && <span aria-hidden className={cx('absolute top-7 left-[0.9rem] h-full w-0.5', r.status === 'missing' ? 'bg-line' : 'bg-info/60')} />}
          <span
            aria-hidden
            className={cx(
              'relative z-10 mt-1 grid size-7 shrink-0 place-items-center rounded-full border-2 text-xs font-black',
              r.status === 'ok' && 'border-ok bg-ok text-slate-950',
              r.status === 'warn' && 'border-crit bg-crit text-white',
              r.status === 'info' && 'border-info bg-info text-slate-950',
              r.status === 'missing' && 'border-line bg-panel text-ink-3',
            )}
          >
            {r.status === 'ok' ? '✓' : r.status === 'warn' ? '!' : i + 1}
          </span>
          <div className="min-w-0 flex-1 rounded-xl border border-line bg-panel-2/50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{r.stage}</span>
              <ProvenanceTag kind={r.kind} label={r.kind === 'official' ? 'Official' : undefined} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-ink-3">Version ID</dt>
                <dd className="truncate font-mono">{r.versionId}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Timestamp</dt>
                <dd className="font-mono">{r.timestamp}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Source</dt>
                <dd>{r.source}</dd>
              </div>
              <div>
                <dt className="text-ink-3">Status</dt>
                <dd className={cx('font-semibold', r.status === 'warn' ? 'text-crit' : r.status === 'ok' ? 'text-ok' : 'text-ink-2')}>{r.statusText}</dd>
              </div>
            </dl>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function CoreFacts({ alert }: { alert: EmergencyAlert }) {
  const facts = [
    { k: 'Event', v: HAZARD_LABEL[alert.type] },
    { k: 'Location', v: alert.affectedArea },
    { k: 'Severity', v: <SeverityBadge severity={alert.severity} /> },
    { k: 'Time', v: `${alert.issuedAt} – ${alert.validUntil}` },
    { k: 'Recommended Action', v: alert.recommendedAction },
  ];
  return (
    <div className="rounded-xl border-2 border-info-2/60 bg-info-2/5 p-4">
      <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-info-2 uppercase">
        <Lock aria-hidden className="size-4" /> Core Emergency Facts — locked across all transformations
      </p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {facts.map((f) => (
          <div key={f.k} className="rounded-lg bg-panel/80 p-2.5">
            <dt className="flex items-center gap-1 text-[0.7rem] font-bold tracking-wider text-ink-3 uppercase">
              <Lock aria-hidden className="size-3" /> {f.k}
            </dt>
            <dd className="mt-1 text-sm font-semibold">{f.v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** Community notes live beside — never inside — the official alert. */
export function CommunityNotes({ alert }: { alert: EmergencyAlert }) {
  const allNotes = useStore((s) => s.communityNotes);
  const notes = useMemo(() => allNotes.filter((n) => n.alertId === alert.id), [allNotes, alert.id]);
  const add = useStore((s) => s.addCommunityNote);
  const remove = useStore((s) => s.removeCommunityNote);
  const [author, setAuthor] = useState('Demo Volunteer');
  const [text, setText] = useState('');
  return (
    <div className="rounded-2xl border-2 border-dashed border-pink/60 bg-pink/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Users aria-hidden className="size-5 text-pink" />
        <h3 className="font-bold">Community Relay Notes</h3>
      </div>
      <p className="mt-2 flex items-start gap-2 rounded-md bg-pink/15 p-2 text-xs font-extrabold tracking-wide text-pink uppercase">
        <TriangleAlert aria-hidden className="size-4 shrink-0" />
        Community-generated information — not part of the official alert
      </p>
      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-ink-3">No community notes for this alert.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-lg border border-pink/40 bg-panel/70 p-3">
              <div className="flex-1">
                <ProvenanceTag kind="community" label="Community note" />
                <p className="mt-1.5 text-sm">“{n.text}”</p>
                <p className="mt-1 text-xs text-ink-3">— {n.author}</p>
              </div>
              <button type="button" onClick={() => remove(n.id)} aria-label={`Remove note by ${n.author}`} className="grid size-9 place-items-center rounded-md text-ink-3 hover:bg-panel-2 hover:text-crit">
                <Trash2 aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 grid gap-2 sm:grid-cols-[10rem_1fr_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          add(alert.id, author.trim() || 'Anonymous volunteer', text.trim());
          setText('');
        }}
      >
        <label className="sr-only" htmlFor="note-author">
          Note author
        </label>
        <input id="note-author" value={author} onChange={(e) => setAuthor(e.target.value)} className="min-h-11 rounded-lg border border-line bg-panel-2 px-3 text-sm" />
        <label className="sr-only" htmlFor="note-text">
          Community note text
        </label>
        <input id="note-text" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Shelter open at Demo Community Hall" className="min-h-11 rounded-lg border border-line bg-panel-2 px-3 text-sm" />
        <Button type="submit" variant="secondary" disabled={!text.trim()}>
          Add note
        </Button>
      </form>
    </div>
  );
}
