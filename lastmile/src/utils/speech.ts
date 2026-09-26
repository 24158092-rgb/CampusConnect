import { languageInfo } from '../data/languages';
import type { LanguageCode } from '../types';

export const speechSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Speaks text with the browser SpeechSynthesis API. Returns false when no voice for the
 * language is installed; the caller decides the fallback so nothing is silently misread.
 */
export function hasVoiceFor(lang: LanguageCode): boolean {
  if (!speechSupported()) return false;
  const prefix = languageInfo(lang).speechLang.slice(0, 2);
  return window.speechSynthesis.getVoices().some((v) => v.lang.toLowerCase().startsWith(prefix));
}

export function speak(text: string, lang: LanguageCode, onEnd?: () => void): boolean {
  if (!speechSupported()) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const speechLang = languageInfo(lang).speechLang;
  utterance.lang = speechLang;
  const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(speechLang.slice(0, 2)));
  if (voice) utterance.voice = voice;
  utterance.rate = 0.9;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  synth.speak(utterance);
  return true;
}

export const stopSpeaking = () => {
  if (speechSupported()) window.speechSynthesis.cancel();
};
