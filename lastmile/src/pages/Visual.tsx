import { ArrowRight, Copy, Download, Image, Printer, Users, Wand2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ValidationChecklist } from '../components/alert';
import { CommunityNotes } from '../components/lineage';
import { ListenButton, PersonaPreview, VisualAlertCard } from '../components/visual';
import { Button, PageHeader, Panel, Segmented, SectionTitle, cx } from '../components/ui';
import { languageInfo, LANGUAGES } from '../data/languages';
import { PERSONAS } from '../data/network';
import { findTransformation, useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { LanguageCode, PersonaId, VisualMode } from '../types';
import { plainLanguageText } from '../utils/content';
import { copyText, DEMO_DISCLAIMER, downloadVisualPng, printAlert } from '../utils/export';

const RECIPIENT_PERSONAS: PersonaId[] = ['general', 'olderAdult', 'lowLiteracy', 'localLanguage', 'volunteer', 'visual'];

export default function Visual() {
  const alert = useSelectedAlert();
  const transformations = useStore((s) => s.transformations);
  const mode = useStore((s) => s.visualMode);
  const lang = useStore((s) => s.previewLanguage);
  const { set, generateVisual } = useStore.getState();
  const navigate = useNavigate();
  const visual = findTransformation(transformations, alert.id, 'visual', lang);
  const available = LANGUAGES.filter((l) => l.code === 'en' || findTransformation(transformations, alert.id, 'translation', l.code));
  const activeLang: LanguageCode = available.some((l) => l.code === lang) ? lang : 'en';

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 5 · Visual Studio"
        title="Visual Studio — low-literacy & icon versions"
        description="Large icons, simple phrases, strong hierarchy and voice. Every mode is rendered from the same locked facts."
        actions={
          <Button variant="primary" icon={ArrowRight} onClick={() => navigate('/delivery')}>
            Simulate delivery
          </Button>
        }
      />

      <Panel className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <Segmented<VisualMode>
          label="Visual version"
          value={mode}
          onChange={(v) => set('visualMode', v)}
          options={[
            { value: 'standard', label: '1 · Standard' },
            { value: 'lowLiteracy', label: '2 · Low-Literacy' },
            { value: 'icon', label: '3 · Icon' },
            { value: 'largeText', label: '4 · Large Text' },
          ]}
        />
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="vis-lang" className="text-sm font-semibold">
            Language
          </label>
          <select id="vis-lang" value={activeLang} onChange={(e) => set('previewLanguage', e.target.value as LanguageCode)} className="min-h-11 rounded-lg border border-line bg-panel-2 px-2">
            {available.map((l) => (
              <option key={l.code} value={l.code}>
                {l.name}
              </option>
            ))}
          </select>
          {available.length < LANGUAGES.length && (
            <Button size="sm" variant="ghost" onClick={() => navigate('/language')}>
              + more languages
            </Button>
          )}
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,34rem)_1fr]">
        <div>
          <h2 className="mb-2 font-mono text-xs font-bold tracking-widest text-ink-2 uppercase">Low Literacy Preview</h2>
          <VisualAlertCard alert={alert} lang={activeLang} mode={mode} id="visual-card" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <ListenButton alert={alert} lang={activeLang} size="lg" className="col-span-2 sm:col-span-3" />
            <Button
              icon={Wand2}
              variant={visual ? 'secondary' : 'primary'}
              onClick={() => {
                generateVisual(alert.id, activeLang);
                toast(`Visual version saved to lineage (${languageInfo(activeLang).name}).`, 'success');
              }}
            >
              {visual ? 'Regenerate' : 'Generate & save'}
            </Button>
            <Button icon={Download} onClick={() => { downloadVisualPng(alert, activeLang); toast('Visual alert PNG downloaded (labelled synthetic).', 'success'); }}>
              PNG
            </Button>
            <Button
              icon={Copy}
              onClick={async () => toast((await copyText(`${plainLanguageText(alert, activeLang)}\n\n${DEMO_DISCLAIMER}`)) ? 'Plain-language text copied.' : 'Copy failed.', 'success')}
            >
              Copy
            </Button>
            <Button icon={Printer} onClick={() => !printAlert(alert, activeLang, plainLanguageText(alert, activeLang)) && toast('Pop-up blocked — allow pop-ups to print.', 'warning')}>
              Print
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {visual ? (
            <ValidationChecklist result={visual.validation} title={`Visual version (${languageInfo(activeLang).name}) — core facts`} />
          ) : (
            <Panel>
              <SectionTitle icon={Image}>Not saved to lineage yet</SectionTitle>
              <p className="text-sm text-ink-3">The preview is live. Click “Generate & save” to register this visual version in the message lineage and run the fact check.</p>
            </Panel>
          )}
          <CommunityNotes alert={alert} />
        </div>
      </div>

      <Panel>
        <SectionTitle icon={Users}>Demo Recipient Personas — same facts, different presentation</SectionTitle>
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {RECIPIENT_PERSONAS.map((p) => {
            const persona = PERSONAS.find((x) => x.id === p)!;
            const personaLang: LanguageCode = p === 'localLanguage' ? (available.find((l) => l.code !== 'en')?.code ?? 'en') : p === 'general' || p === 'visual' ? 'en' : activeLang;
            return (
              <div key={p} className={cx('rounded-xl border border-line bg-panel/60 p-3')}>
                <PersonaPreview alert={alert} persona={persona.id} lang={personaLang} />
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
