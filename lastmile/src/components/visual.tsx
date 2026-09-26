import { motion } from 'framer-motion';
import { Ear, HandHelping, ListChecks, Radio, Signal, Square, Volume2, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HAZARD_BANK, languageInfo, TEMPLATES } from '../data/languages';
import { personaById } from '../data/network';
import { toast } from '../store/useToasts';
import type { AckType, DeliveryRecord, EmergencyAlert, LanguageCode, PersonaId, VisualMode } from '../types';
import { lowLiteracyLines, plainLanguageLines, smsText, speechScript, visualRows } from '../utils/content';
import { hasVoiceFor, speak, speechSupported, stopSpeaking } from '../utils/speech';
import { ProvenanceTag, SeverityBadge, StatusBadge, SyntheticLabel } from './badges';
import { Button, cx } from './ui';

export function ListenButton({ alert, lang, size = 'md', className }: { alert: EmergencyAlert; lang: LanguageCode; size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const [playing, setPlaying] = useState(false);
  useEffect(() => () => stopSpeaking(), []);
  const onClick = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      return;
    }
    if (!speechSupported()) {
      toast('Voice playback is not supported in this browser.', 'warning');
      return;
    }
    let useLang = lang;
    if (!hasVoiceFor(lang) && lang !== 'en') {
      useLang = 'en';
      toast(`No ${languageInfo(lang).name} voice installed on this device — reading the English plain-language version instead.`, 'warning');
    }
    setPlaying(speak(speechScript(alert, useLang), useLang, () => setPlaying(false)));
  };
  return (
    <Button size={size} variant={playing ? 'danger' : 'secondary'} icon={playing ? Square : Volume2} onClick={onClick} aria-pressed={playing} className={className}>
      {playing ? 'Stop voice' : '🔊 Listen to Alert'}
    </Button>
  );
}

const TONE_BORDER = { hazard: 'border-crit', location: 'border-info', time: 'border-amber', action: 'border-ok', donot: 'border-crit' };

/** Visual / low-literacy alert. All four modes render the same locked facts. */
export function VisualAlertCard({ alert, lang, mode, id }: { alert: EmergencyAlert; lang: LanguageCode; mode: VisualMode; id?: string }) {
  const v = visualRows(alert, lang);
  const t = TEMPLATES[lang];
  return (
    <article id={id} lang={lang} aria-label={`Visual alert: ${v.headline}, severity ${v.severity}`} className="overflow-hidden rounded-2xl border-2 border-violet/60 bg-[#0a0f1c]">
      <div className={cx('flex items-center gap-4 p-4', alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'bg-red-700' : alert.severity === 'WARNING' ? 'bg-orange-700' : 'bg-cyan-800')}>
        <span aria-hidden className={cx('leading-none', mode === 'icon' ? 'text-7xl' : 'text-5xl')}>
          {v.icon}
        </span>
        <div>
          <p className={cx('font-black tracking-tight text-white', mode === 'largeText' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl')}>{v.headline}</p>
          <p className="mt-1 inline-flex items-center gap-1 rounded bg-black/30 px-2 py-0.5 text-sm font-bold text-white">● {v.severity}</p>
        </div>
      </div>

      {mode === 'standard' && (
        <div className="space-y-2 p-4 text-lg text-white">
          {plainLanguageLines(alert, lang).map((l) => (
            <p key={l}>{l}</p>
          ))}
        </div>
      )}

      {mode === 'lowLiteracy' && (
        <ol className="space-y-3 p-4">
          {lowLiteracyLines(alert, lang).map((l) => (
            <li key={l.text} className="flex items-center gap-4 rounded-xl bg-white/5 p-3">
              <span aria-hidden className="text-4xl">
                {l.icon}
              </span>
              <span className="text-xl font-extrabold text-white sm:text-2xl">{l.text}</span>
            </li>
          ))}
        </ol>
      )}

      {mode === 'icon' && (
        <div className="grid grid-cols-2 gap-3 p-4">
          {v.rows.map((r) => (
            <div key={r.label} className={cx('flex flex-col items-center rounded-xl border-2 bg-white/5 p-3 text-center', TONE_BORDER[r.tone])}>
              <span aria-hidden className="text-5xl">
                {r.icon}
              </span>
              <span className="mt-2 text-xs font-bold tracking-wider text-slate-300 uppercase">{r.label}</span>
              <span className="mt-1 font-extrabold text-white">{r.value}</span>
            </div>
          ))}
        </div>
      )}

      {mode === 'largeText' && (
        <div className="space-y-4 p-5">
          {v.rows.map((r) => (
            <div key={r.label} className={cx('border-l-8 pl-4', TONE_BORDER[r.tone])}>
              <p className="text-base font-bold tracking-wider text-slate-300 uppercase">
                <span aria-hidden>{r.icon} </span>
                {r.label}
              </p>
              <p className="text-3xl leading-tight font-black text-white">{r.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-black/40 px-4 py-2">
        <ProvenanceTag kind="generated" label={`Visual version · ${languageInfo(lang).name}`} />
        <span className="font-mono text-[0.68rem] font-bold text-amber">SYNTHETIC DEMO · {t.labels.warning} · {alert.id}</span>
      </div>
    </article>
  );
}

/** Persona-adapted presentation. Underlying facts are identical for every persona. */
export function PersonaPreview({ alert, persona, lang }: { alert: EmergencyAlert; persona: PersonaId; lang: LanguageCode }) {
  const p = personaById(persona);
  const t = TEMPLATES[lang];
  const v = visualRows(alert, lang);
  const hazard = HAZARD_BANK[alert.type][lang];
  const plain = plainLanguageLines(alert, lang);

  const body = (() => {
    switch (persona) {
      case 'lowLiteracy':
        return <VisualAlertCard alert={alert} lang={lang} mode="lowLiteracy" />;
      case 'olderAdult':
        return (
          <div className="rounded-2xl border-4 border-white bg-black p-5 text-white">
            <p className="text-3xl font-black">
              <span aria-hidden>{v.icon} </span>
              {v.headline}
            </p>
            <p className="mt-4 text-2xl font-bold">{t.doNow}:</p>
            <p className="mt-1 text-4xl leading-tight font-black text-yellow-300">{v.rows[2].value}</p>
            <p className="mt-4 text-xl">
              {t.area}: <b>{v.rows[0].value}</b>
            </p>
            <p className="text-xl">
              {t.labels.time}: <b>{v.rows[1].value}</b>
            </p>
          </div>
        );
      case 'visual':
        return (
          <div className="rounded-2xl border-4 border-yellow-300 bg-black p-5 text-yellow-100">
            <h4 className="text-2xl font-black text-yellow-300">{v.headline}</h4>
            <ul className="mt-3 space-y-2 text-xl" aria-label="Alert details for screen readers">
              {plain.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <ListenButton alert={alert} lang={lang} size="lg" className="mt-4 w-full" />
          </div>
        );
      case 'hearing':
        return (
          <div className="space-y-3">
            <motion.div aria-hidden className="h-3 rounded-full bg-crit" animate={{ opacity: [1, 0.25, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} />
            <p className="flex items-center gap-2 text-sm text-ink-2">
              <Ear aria-hidden className="size-4" /> Visual flash cue replaces siren — no audio needed.
            </p>
            <VisualAlertCard alert={alert} lang={lang} mode="icon" />
          </div>
        );
      case 'volunteer':
        return (
          <div className="rounded-2xl border-2 border-pink/60 bg-panel-2 p-4">
            <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-widest text-pink uppercase">
              <Radio aria-hidden className="size-4" /> Relay package · community volunteer
            </p>
            <p className="mt-2 text-lg font-bold">{v.headline} — {v.severity}</p>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
              <li>Read the official message aloud, word-for-word, to households in <b>{v.rows[0].value}</b>.</li>
              <li>Priority target group: older adults, people with disabilities, households without phones.</li>
              <li>Key action to repeat: <b>{v.rows[2].value}</b>. Do not: <b>{v.rows[3].value}</b>.</li>
              <li>Valid {v.rows[1].value}. Do not add your own information to the official message.</li>
              <li>Collect acknowledgements: mark each household “received”, “understood” or “needs help”.</li>
            </ol>
            <p className="mt-3 inline-flex items-center gap-1 text-xs text-ink-3">
              <ListChecks aria-hidden className="size-4" /> Acknowledgements flow back to the Receipt Tracker.
            </p>
          </div>
        );
      case 'localLanguage':
      case 'general':
      default:
        return (
          <div className="rounded-2xl border border-line bg-panel-2 p-4" lang={lang}>
            <div className="flex flex-wrap items-center gap-2">
              <SeverityBadge severity={alert.severity} />
              <span className="font-bold">
                {hazard.name} {t.labels.warning}
              </span>
            </div>
            <ul className="mt-3 space-y-1.5">
              {plain.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-3">{t.footer}</p>
          </div>
        );
    }
  })();

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-bold">{p.label}</span>
        <span className="text-xs text-ink-3">· {p.traits.join(' · ')}</span>
      </div>
      {body}
      <div className="mt-2 flex flex-wrap gap-2">
        <ProvenanceTag kind={lang === 'en' ? 'simplified' : 'translated'} />
        {persona !== 'visual' && persona !== 'volunteer' && <ListenButton alert={alert} lang={lang} size="sm" />}
      </div>
    </div>
  );
}

const ACK_LABEL: Record<AckType, string> = { received: 'I received this alert', understood: 'I understand what to do', needHelp: 'I need help' };

export function RecipientPhonePreview({ alert, record, lang, onAck }: { alert: EmergencyAlert; record?: DeliveryRecord; lang: LanguageCode; onAck?: (ack: AckType) => void }) {
  const text = smsText(alert, lang);
  const canAck = record && ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(record.status);
  return (
    <div className="mx-auto w-full max-w-[320px]">
      <div className="rounded-[2.2rem] border-[6px] border-slate-700 bg-slate-950 p-3 shadow-2xl">
        <div className="mb-2 flex items-center justify-between px-2 text-[0.65rem] text-slate-400">
          <span>DEMO NET</span>
          <span aria-hidden className="h-4 w-16 rounded-full bg-slate-800" />
          <span className="flex items-center gap-1">
            <Signal aria-hidden className="size-3" />
            <Wifi aria-hidden className="size-3" />
          </span>
        </div>
        <div className="min-h-[340px] rounded-2xl bg-slate-900 p-3">
          <p className="text-center text-[0.65rem] font-bold tracking-widest text-amber">SIMULATED SMS — NO REAL MESSAGE SENT</p>
          <p className="mt-2 text-xs text-slate-400">
            From: <b className="text-slate-200">EMERGENCY DEMO</b>
          </p>
          {record && record.status !== 'QUEUED' && record.status !== 'IN_TRANSIT' && record.status !== 'FAILED' && record.status !== 'RETRYING' ? (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} lang={lang} className="mt-2 rounded-2xl rounded-tl-sm bg-slate-700 p-3 text-sm leading-relaxed text-white">
              {text}
            </motion.div>
          ) : record ? (
            <div className="mt-6 flex flex-col items-center gap-2 text-center text-sm text-slate-400">
              <StatusBadge status={record.status} />
              <p>Waiting for the message to arrive…</p>
            </div>
          ) : (
            <div lang={lang} className="mt-2 rounded-2xl rounded-tl-sm bg-slate-700 p-3 text-sm leading-relaxed text-white">
              {text}
            </div>
          )}
          {record && (
            <div className="mt-4 space-y-2">
              {(Object.keys(ACK_LABEL) as AckType[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  disabled={!canAck}
                  onClick={() => onAck?.(a)}
                  aria-pressed={record.acknowledged === a}
                  className={cx(
                    'flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition disabled:opacity-40',
                    a === 'needHelp' ? 'bg-crit text-white' : 'bg-ok text-slate-950',
                    record.acknowledged === a && 'ring-4 ring-white',
                  )}
                >
                  {a === 'needHelp' && <HandHelping aria-hidden className="size-4" />}
                  {ACK_LABEL[a]}
                  {record.acknowledged === a && ' ✓'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2 flex justify-center">
        <SyntheticLabel />
      </div>
    </div>
  );
}
