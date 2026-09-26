import { HAZARD_BANK, SEVERITY_WORDS, TEMPLATES } from '../data/languages';
import type { EmergencyAlert, LanguageCode, LocalizedFields } from '../types';

export interface ResolvedFields extends LocalizedFields {
  /** Field names that fell back to the official English wording. */
  untranslated: string[];
}

/** Localized field values; free-text fields fall back to the official English wording (never invented). */
export function resolveFields(alert: EmergencyAlert, lang: LanguageCode): ResolvedFields {
  const en: LocalizedFields = alert.localized.en ?? {
    area: alert.affectedArea,
    action: stripPeriod(alert.recommendedAction),
    doNot: alert.doNot,
  };
  const loc = alert.localized[lang];
  if (lang === 'en' || !loc) {
    return { ...en, untranslated: lang === 'en' ? [] : ['area', 'action', 'do-not'] };
  }
  return { ...loc, untranslated: [] };
}

const stripPeriod = (s: string) => s.trim().replace(/[.。।]+$/, '');

export interface PlainOptions {
  /** Deliberately drop the time line to demonstrate the validator catching an omission. */
  injectOmission?: boolean;
}

export function plainLanguageLines(alert: EmergencyAlert, lang: LanguageCode, opts: PlainOptions = {}): string[] {
  const t = TEMPLATES[lang];
  const f = resolveFields(alert, lang);
  const hazard = HAZARD_BANK[alert.type][lang];
  const sev = SEVERITY_WORDS[lang][alert.severity];
  const end = lang === 'en' ? '.' : '।';
  const lines = [
    hazard.sentence,
    `${t.dangerLevel}: ${sev}${end}`,
    `${t.area}: ${f.area}${end}`,
    t.time(alert.issuedAt, alert.validUntil),
    `${t.doNow}: ${f.action}${end}`,
    `${t.doNot}: ${f.doNot}${end}`,
  ];
  return opts.injectOmission ? lines.filter((_, i) => i !== 3) : lines;
}

export const plainLanguageText = (alert: EmergencyAlert, lang: LanguageCode, opts?: PlainOptions) =>
  plainLanguageLines(alert, lang, opts).join('\n');

export function smsText(alert: EmergencyAlert, lang: LanguageCode): string {
  const f = resolveFields(alert, lang);
  return TEMPLATES[lang].sms({
    sev: SEVERITY_WORDS[lang][alert.severity],
    name: HAZARD_BANK[alert.type][lang].name,
    action: f.action,
    doNot: f.doNot,
    area: f.area,
    start: alert.issuedAt,
    end: alert.validUntil,
  });
}

export type FactIconKind = 'hazard' | 'location' | 'time' | 'action' | 'donot';

export interface VisualRow {
  icon: Exclude<FactIconKind, 'hazard'>;
  label: string;
  value: string;
  tone: 'hazard' | 'location' | 'time' | 'action' | 'donot';
}

export function visualRows(alert: EmergencyAlert, lang: LanguageCode): { headline: string; severity: string; rows: VisualRow[] } {
  const t = TEMPLATES[lang];
  const f = resolveFields(alert, lang);
  const hazard = HAZARD_BANK[alert.type][lang];
  return {
    headline: `${hazard.name} ${t.labels.warning}`,
    severity: SEVERITY_WORDS[lang][alert.severity],
    rows: [
      { icon: 'location', label: t.labels.affectedArea, value: f.area, tone: 'location' },
      { icon: 'time', label: t.labels.time, value: `${alert.issuedAt}–${alert.validUntil}`, tone: 'time' },
      { icon: 'action', label: t.labels.action, value: `${f.action} — ${t.labels.now}`, tone: 'action' },
      { icon: 'donot', label: t.labels.doNot, value: f.doNot, tone: 'donot' },
    ],
  };
}

export function lowLiteracyLines(alert: EmergencyAlert, lang: LanguageCode): { icon: FactIconKind; text: string }[] {
  const t = TEMPLATES[lang];
  const f = resolveFields(alert, lang);
  const hazard = HAZARD_BANK[alert.type][lang];
  const sev = SEVERITY_WORDS[lang][alert.severity];
  return [
    { icon: 'hazard', text: `${hazard.name} ${t.labels.coming} · ${sev}` },
    { icon: 'location', text: `${t.labels.yourArea}: ${f.area}` },
    { icon: 'action', text: `1. ${f.action} — ${t.labels.now}` },
    { icon: 'donot', text: `2. ${t.labels.doNot}: ${f.doNot}` },
    { icon: 'time', text: `${alert.issuedAt}–${alert.validUntil}` },
  ];
}

export function visualText(alert: EmergencyAlert, lang: LanguageCode): string {
  const v = visualRows(alert, lang);
  return [`${v.headline} (${v.severity})`, ...v.rows.map((r) => `${r.label}: ${r.value}`)].join('\n');
}

/** Text used for speech playback: plain-language lines in the chosen language. */
export const speechScript = (alert: EmergencyAlert, lang: LanguageCode) => plainLanguageLines(alert, lang).join(' ');

export interface SmsStats {
  chars: number;
  bytes: number;
  encoding: 'GSM-7' | 'UCS-2';
  segments: number;
}

export function smsStats(text: string): SmsStats {
  const gsm = /^[\x20-\x7E\n\r]*$/.test(text);
  const chars = [...text].length;
  const encoding = gsm ? 'GSM-7' : 'UCS-2';
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  const segments = chars <= single ? 1 : Math.ceil(chars / multi);
  const bytes = gsm ? Math.ceil((chars * 7) / 8) : chars * 2;
  return { chars, bytes, encoding, segments };
}

/** Descriptive text statistics for the Before/After comparison (not a readability score). */
export function textStats(text: string) {
  const sentences = text.split(/[.!?\n।]+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 1);
  const words = text.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  const longWords = words.filter((w) => w.replace(/[^\p{L}]/gu, '').length >= 10).length;
  return {
    sentences: sentences.length,
    words: words.length,
    avgSentence: sentences.length ? Math.round(words.length / sentences.length) : words.length,
    longWords,
  };
}
