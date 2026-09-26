import { ArrowRight, Languages, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { HighlightedText, ValidationChecklist } from '../components/alert';
import { ProvenanceTag } from '../components/badges';
import { ListenButton } from '../components/visual';
import { Button, EmptyState, PageHeader, Panel, ProgressBar, SectionTitle, Toggle, cx } from '../components/ui';
import { languageInfo, LANGUAGES } from '../data/languages';
import { findTransformation, useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { AlertTransformation, EmergencyAlert, LanguageCode } from '../types';
import { expectedFacts } from '../utils/validation';

export function TranslationCard({ alert, t }: { alert: EmergencyAlert; t: AlertTransformation }) {
  const info = languageInfo(t.language);
  const f = expectedFacts(alert, t.language);
  return (
    <article className="rounded-2xl border border-ok/50 bg-panel p-4" aria-label={`${info.name} translation`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold">
          {info.nativeName} <span className="text-sm font-medium text-ink-3">· {info.name}</span>
        </h3>
        <ProvenanceTag kind="translated" />
      </div>
      <p lang={t.language} className="mt-3 text-lg leading-relaxed whitespace-pre-line">
        <HighlightedText text={t.content} entities={{ hazard: f.hazard, severity: f.severity, location: f.area, time: [...f.start, ...f.end], action: f.action }} />
      </p>
      <p className="mt-2 font-mono text-[0.7rem] text-ink-3">
        {t.id} · parent {t.parentId} · not a certified translation
      </p>
      <div className="mt-3">
        <ValidationChecklist result={t.validation} title={`${info.name}: core facts`} compact />
      </div>
      <div className="mt-3">
        <ListenButton alert={alert} lang={t.language} size="sm" />
      </div>
    </article>
  );
}

export default function Language() {
  const alert = useSelectedAlert();
  const transformations = useStore((s) => s.transformations);
  const selected = useStore((s) => s.selectedLanguages);
  const preview = useStore((s) => s.previewLanguage);
  const outage = useStore((s) => s.translationOutage);
  const { set, generateTranslations } = useStore.getState();
  const navigate = useNavigate();
  const [failed, setFailed] = useState<LanguageCode[]>([]);
  const [busy, setBusy] = useState(false);

  const plain = findTransformation(transformations, alert.id, 'plain', 'en');
  const translations = LANGUAGES.map((l) => findTransformation(transformations, alert.id, 'translation', l.code)).filter((t): t is AlertTransformation => Boolean(t));
  const covered = translations.length + (plain ? 1 : 0);
  const previewT = findTransformation(transformations, alert.id, 'translation', preview);

  const toggle = (code: LanguageCode) => set('selectedLanguages', selected.includes(code) ? selected.filter((c) => c !== code) : [...selected, code]);

  const generate = (langs: LanguageCode[]) => {
    setBusy(true);
    setTimeout(() => {
      const res = generateTranslations(alert.id, langs);
      setFailed(res.failed);
      setBusy(false);
      if (res.ok.length) {
        toast(`${res.ok.length} demo translation(s) generated and validated.`, 'success');
        if (!res.ok.includes(preview)) set('previewLanguage', res.ok[0]);
      }
      if (res.failed.length) toast(`Translation unavailable for ${res.failed.map((l) => languageInfo(l).name).join(', ')} — English fallback queued. Retry when the engine recovers.`, 'error');
    }, 700);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 4 · Language Bank"
        title="Language Bank / Translation"
        description="Pre-authored synthetic translations from a local phrase bank — no external API. Never presented as certified translations; every version is re-checked for the core facts."
        actions={
          <Button variant="primary" icon={ArrowRight} disabled={!translations.length} onClick={() => navigate('/visual')}>
            Create visual version
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <Panel>
          <SectionTitle icon={Languages}>Select target languages</SectionTitle>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Target languages">
            {LANGUAGES.map((l) => {
              const on = selected.includes(l.code);
              const isEn = l.code === 'en';
              return (
                <button
                  key={l.code}
                  type="button"
                  aria-pressed={on || isEn}
                  disabled={isEn}
                  onClick={() => toggle(l.code)}
                  className={cx('flex min-h-12 flex-col items-start rounded-xl border px-4 py-1.5 text-left transition', on || isEn ? 'border-ok bg-ok/10' : 'border-line hover:border-ok/60')}
                >
                  <span className="font-bold" lang={l.code}>
                    {l.nativeName}
                  </span>
                  <span className="text-xs text-ink-3">{isEn ? 'Source (plain language)' : l.name}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="primary" icon={Languages} disabled={busy || !selected.some((c) => c !== 'en')} onClick={() => generate(selected)}>
              {busy ? 'Generating…' : 'Generate translations'}
            </Button>
            {failed.length > 0 && (
              <Button icon={RefreshCw} onClick={() => generate(failed)} disabled={busy}>
                Retry failed ({failed.length})
              </Button>
            )}
          </div>
          <div className="mt-4 border-t border-line pt-3">
            <Toggle
              checked={outage}
              onChange={(v) => set('translationOutage', v)}
              label="Simulate translation engine outage"
              description="Failure simulation: translations become unavailable, English plain language is used as fallback."
            />
          </div>
        </Panel>
        <Panel>
          <p className="text-xs font-semibold tracking-wide text-ink-2 uppercase">Language Coverage</p>
          <p className="mt-2 font-mono text-4xl font-bold">
            {covered}
            <span className="text-lg text-ink-3">/{LANGUAGES.length}</span>
          </p>
          <div className="mt-2">
            <ProgressBar value={(covered / LANGUAGES.length) * 100} tone="ok" label="Language coverage" />
          </div>
          <ul className="mt-3 space-y-1 text-sm">
            {LANGUAGES.map((l) => {
              const has = l.code === 'en' ? Boolean(plain) : translations.some((t) => t.language === l.code);
              return (
                <li key={l.code} className="flex justify-between">
                  <span>{l.name}</span>
                  <span className={has ? 'font-bold text-ok' : failed.includes(l.code) ? 'font-bold text-crit' : 'text-ink-3'}>{has ? '✓ ready' : failed.includes(l.code) ? '✕ unavailable' : '—'}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {translations.length === 0 ? (
        <EmptyState icon={Languages} title="No translations yet" action={<Button variant="primary" onClick={() => generate(selected)}>Generate translations</Button>}>
          Select one or more languages and generate. The plain-language version is created automatically if needed.
        </EmptyState>
      ) : (
        <>
          <Panel>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Compare: English ↔ translation</h2>
              <label className="flex items-center gap-2 text-sm">
                Preview language
                <select value={preview} onChange={(e) => set('previewLanguage', e.target.value as LanguageCode)} className="min-h-10 rounded-lg border border-line bg-panel-2 px-2">
                  {translations.map((t) => (
                    <option key={t.language} value={t.language}>
                      {languageInfo(t.language).name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-info/50 bg-panel-2/40 p-4">
                <ProvenanceTag kind="simplified" label="English · plain language (source for translation)" />
                <p className="mt-3 text-lg leading-relaxed whitespace-pre-line">{plain?.content}</p>
              </div>
              <div className="rounded-xl border border-ok/50 bg-panel-2/40 p-4">
                <ProvenanceTag kind="translated" label={`${languageInfo(preview).name} · translated demo content`} />
                <p lang={preview} className="mt-3 text-lg leading-relaxed whitespace-pre-line">
                  {previewT?.content ?? 'Not generated for this language yet.'}
                </p>
              </div>
            </div>
          </Panel>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {translations.map((t) => (
              <TranslationCard key={t.id} alert={alert} t={t} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
