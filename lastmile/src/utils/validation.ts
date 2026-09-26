import { HAZARD_BANK, SEVERITY_WORDS, URGENCY_TOKENS } from '../data/languages';
import type { EmergencyAlert, FactCheck, FactKey, LanguageCode, ValidationResult } from '../types';
import { resolveFields } from './content';

/**
 * Deterministic, rule-based demo validator. It checks that the core facts extracted from the
 * structured official alert still appear in a transformed version. It is NOT an AI model and
 * NOT a certified semantic guarantee.
 */
export const FACT_LABELS: Record<FactKey, string> = {
  hazard: 'Hazard retained',
  severity: 'Severity retained',
  area: 'Location retained',
  start: 'Start time retained',
  end: 'End time retained',
  action: 'Action retained',
  urgency: 'Urgency retained',
};

export function expectedFacts(alert: EmergencyAlert, lang: LanguageCode, official = false): Record<FactKey, string[]> {
  const f = resolveFields(alert, lang);
  return {
    hazard: [HAZARD_BANK[alert.type][lang].token],
    severity: [SEVERITY_WORDS[lang][alert.severity]],
    area: [f.area],
    start: [alert.issuedAt],
    end: [alert.validUntil],
    action: official ? alert.actionKeywords : [f.action],
    urgency: URGENCY_TOKENS[lang],
  };
}

const normalize = (s: string) => s.toLocaleLowerCase().replace(/\s+/g, ' ');

export function validateContent(alert: EmergencyAlert, lang: LanguageCode, content: string, official = false): ValidationResult {
  const expected = expectedFacts(alert, lang, official);
  const text = normalize(content);
  const checks: FactCheck[] = (Object.keys(expected) as FactKey[]).map((key) => ({
    key,
    label: FACT_LABELS[key],
    expected: expected[key],
    passed: expected[key].some((token) => text.includes(normalize(token))),
  }));
  return {
    checks,
    passed: checks.every((c) => c.passed),
    untranslated: official ? [] : resolveFields(alert, lang).untranslated,
  };
}

export const validateOfficial = (alert: EmergencyAlert) => validateContent(alert, 'en', alert.originalMessage, true);
