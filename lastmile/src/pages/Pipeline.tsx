import { GitBranch, Hammer, RotateCcw, ShieldCheck } from 'lucide-react';
import { useMemo } from 'react';
import { ProvenanceTag } from '../components/badges';
import { CoreFacts, LineageGraph } from '../components/lineage';
import { PipelineFlow } from '../components/pipeline';
import { Button, EmptyState, PageHeader, Panel, SectionTitle, cx } from '../components/ui';
import { languageInfo, LANGUAGES } from '../data/languages';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { FactKey, LanguageCode } from '../types';
import { FACT_LABELS, validateOfficial } from '../utils/validation';

const COLS: FactKey[] = ['hazard', 'severity', 'area', 'start', 'end', 'action', 'urgency'];
const TYPE_LABEL = { plain: 'Plain language', translation: 'Translation', visual: 'Visual version', sms: 'SMS package' };

export default function Pipeline() {
  const alert = useSelectedAlert();
  const transformations = useStore((s) => s.transformations);
  const lang = useStore((s) => s.previewLanguage);
  const demoRunning = useStore((s) => Boolean(s.demo.mode));
  const { set, buildPipeline, resetPipeline } = useStore.getState();
  const rows = useMemo(() => transformations.filter((t) => t.alertId === alert.id), [transformations, alert.id]);
  const official = validateOfficial(alert);
  const allPassed = rows.every((r) => r.validation.passed) && official.passed;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Pipeline · Lineage · Integrity"
        title="Message Lineage & Alert Validation Engine"
        description="Every generated version keeps a link to the original alert. Core emergency facts are locked and re-checked after each transformation."
        actions={
          <>
            <Button variant="primary" icon={Hammer} onClick={() => { buildPipeline(alert.id); toast('Complete pipeline built for all languages.', 'success'); }}>
              Build complete pipeline
            </Button>
            <Button icon={RotateCcw} disabled={demoRunning} onClick={() => { resetPipeline(alert.id); toast('Derived versions cleared. The official alert is untouched.', 'info'); }}>
              Reset derived versions
            </Button>
          </>
        }
      />
      <Panel>
        <PipelineFlow alertId={alert.id} />
      </Panel>
      <CoreFacts alert={alert} />

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <Panel>
          <SectionTitle
            icon={GitBranch}
            right={
              <select aria-label="Lineage language path" value={lang} onChange={(e) => set('previewLanguage', e.target.value as LanguageCode)} className="min-h-10 rounded-lg border border-line bg-panel-2 px-2 text-sm">
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name} path
                  </option>
                ))}
              </select>
            }
          >
            Message Lineage
          </SectionTitle>
          <LineageGraph alert={alert} lang={lang} />
        </Panel>

        <Panel id="validation">
          <SectionTitle icon={ShieldCheck} right={<span className={cx('rounded-md px-2 py-0.5 text-xs font-extrabold', allPassed ? 'bg-ok text-slate-950' : 'bg-crit text-white')}>{allPassed ? 'ALL FACTS RETAINED' : '⚠ CONTENT VALIDATION REQUIRED'}</span>}>
            Alert Validation Engine
          </SectionTitle>
          <p className="mb-3 text-xs text-ink-3">Deterministic checks: structured official fields → expected tokens per language → presence in each version. A demo integrity checker, not a certified semantic guarantee and not a machine-learning model.</p>
          {rows.length === 0 ? (
            <EmptyState icon={ShieldCheck} title="No derived versions yet" action={<Button variant="primary" onClick={() => buildPipeline(alert.id)}>Build complete pipeline</Button>}>
              Build the pipeline to validate every version against the official alert.
            </EmptyState>
          ) : (
            <div className="scrollbar-thin relative overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Validation matrix of core facts per version</caption>
                <thead>
                  <tr className="border-b border-line text-left font-mono text-[0.65rem] tracking-wider text-ink-3 uppercase">
                    <th scope="col" className="py-2 pr-2">Version</th>
                    {COLS.map((c) => (
                      <th key={c} scope="col" className="px-1 py-2 text-center">
                        {FACT_LABELS[c].replace(' retained', '')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[{ id: `${alert.id}-SRC`, label: 'Official source', kind: 'official' as const, checks: official.checks }, ...rows.map((r) => ({ id: r.id, label: `${TYPE_LABEL[r.type]} · ${languageInfo(r.language).name}`, kind: r.sourceType, checks: r.validation.checks }))].map((row) => (
                    <tr key={row.id} className="border-b border-line/50">
                      <th scope="row" className="py-2 pr-2 text-left font-normal">
                        <span className="block font-semibold">{row.label}</span>
                        <ProvenanceTag kind={row.kind} label={row.kind} />
                      </th>
                      {COLS.map((c) => {
                        const ok = row.checks.find((x) => x.key === c)?.passed;
                        return (
                          <td key={c} className="px-1 text-center">
                            <span className={cx('inline-grid size-7 place-items-center rounded-md text-xs font-black', ok ? 'bg-ok/20 text-ok' : 'bg-crit text-white')} aria-label={`${FACT_LABELS[c]}: ${ok ? 'yes' : 'missing'}`}>
                              {ok ? '✓' : '✕'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
