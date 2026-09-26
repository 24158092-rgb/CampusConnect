import type { HazardType, LanguageCode, Severity } from '../types';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  speechLang: string;
  /** Non-Latin scripts need UCS-2 SMS encoding (70 chars per segment). */
  ucs2: boolean;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', speechLang: 'en-IN', ucs2: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', speechLang: 'hi-IN', ucs2: true },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', speechLang: 'or-IN', ucs2: true },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', speechLang: 'bn-IN', ucs2: true },
];

export const languageInfo = (code: LanguageCode): LanguageInfo =>
  LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];

interface HazardPhrase {
  name: string;
  sentence: string;
  token: string;
}

/** Pre-authored synthetic phrase bank. Not certified translations. */
export const HAZARD_BANK: Record<HazardType, Record<LanguageCode, HazardPhrase>> = {
  flood: {
    en: { name: 'FLOOD', sentence: 'Flash flooding is expected.', token: 'flood' },
    hi: { name: 'बाढ़', sentence: 'अचानक बाढ़ आने की आशंका है।', token: 'बाढ़' },
    or: { name: 'ବନ୍ୟା', sentence: 'ହଠାତ୍ ବନ୍ୟା ଆସିବାର ଆଶଙ୍କା ଅଛି।', token: 'ବନ୍ୟା' },
    bn: { name: 'বন্যা', sentence: 'হঠাৎ বন্যার আশঙ্কা আছে।', token: 'বন্যা' },
  },
  cyclone: {
    en: { name: 'CYCLONE', sentence: 'A strong cyclone is coming.', token: 'cyclone' },
    hi: { name: 'चक्रवात', sentence: 'एक तेज़ चक्रवात आ रहा है।', token: 'चक्रवात' },
    or: { name: 'ବାତ୍ୟା', sentence: 'ଏକ ପ୍ରବଳ ବାତ୍ୟା ଆସୁଛି।', token: 'ବାତ୍ୟା' },
    bn: { name: 'ঘূর্ণিঝড়', sentence: 'একটি শক্তিশালী ঘূর্ণিঝড় আসছে।', token: 'ঘূর্ণিঝড়' },
  },
  heat: {
    en: { name: 'EXTREME HEAT', sentence: 'Extreme heat is expected.', token: 'heat' },
    hi: { name: 'भीषण गर्मी', sentence: 'अत्यधिक गर्मी की आशंका है।', token: 'गर्मी' },
    or: { name: 'ପ୍ରବଳ ଗରମ', sentence: 'ଅତ୍ୟଧିକ ଗରମର ଆଶଙ୍କା ଅଛି।', token: 'ଗରମ' },
    bn: { name: 'প্রচণ্ড গরম', sentence: 'প্রচণ্ড গরমের আশঙ্কা আছে।', token: 'গরম' },
  },
  heavyRain: {
    en: { name: 'HEAVY RAIN', sentence: 'Very heavy rain is expected.', token: 'rain' },
    hi: { name: 'भारी बारिश', sentence: 'बहुत भारी बारिश की आशंका है।', token: 'बारिश' },
    or: { name: 'ଭାରି ବର୍ଷା', sentence: 'ବହୁତ ଭାରି ବର୍ଷାର ଆଶଙ୍କା ଅଛି।', token: 'ବର୍ଷା' },
    bn: { name: 'ভারী বৃষ্টি', sentence: 'খুব ভারী বৃষ্টির আশঙ্কা আছে।', token: 'বৃষ্টি' },
  },
  severeWeather: {
    en: { name: 'SEVERE WEATHER', sentence: 'Severe weather is expected.', token: 'weather' },
    hi: { name: 'गंभीर मौसम', sentence: 'गंभीर मौसम की आशंका है।', token: 'मौसम' },
    or: { name: 'ଗୁରୁତର ପାଣିପାଗ', sentence: 'ଗୁରୁତର ପାଣିପାଗର ଆଶଙ୍କା ଅଛି।', token: 'ପାଣିପାଗ' },
    bn: { name: 'দুর্যোগপূর্ণ আবহাওয়া', sentence: 'তীব্র দুর্যোগপূর্ণ আবহাওয়ার আশঙ্কা আছে।', token: 'আবহাওয়া' },
  },
};

export const SEVERITY_WORDS: Record<LanguageCode, Record<Severity, string>> = {
  en: { INFO: 'INFO', WARNING: 'WARNING', HIGH: 'HIGH', CRITICAL: 'CRITICAL' },
  hi: { INFO: 'सूचना', WARNING: 'चेतावनी', HIGH: 'उच्च', CRITICAL: 'अति गंभीर' },
  or: { INFO: 'ସୂଚନା', WARNING: 'ସତର୍କ', HIGH: 'ଉଚ୍ଚ', CRITICAL: 'ଅତି ଗୁରୁତର' },
  bn: { INFO: 'তথ্য', WARNING: 'সতর্ক', HIGH: 'উচ্চ', CRITICAL: 'অতি গুরুতর' },
};

export const URGENCY_TOKENS: Record<LanguageCode, string[]> = {
  en: ['now', 'immediately'],
  hi: ['अभी'],
  or: ['ବର୍ତ୍ତମାନ'],
  bn: ['এখনই'],
};

export interface LanguageTemplate {
  dangerLevel: string;
  area: string;
  time: (start: string, end: string) => string;
  doNow: string;
  doNot: string;
  footer: string;
  sms: (p: { sev: string; name: string; action: string; doNot: string; area: string; start: string; end: string }) => string;
  labels: {
    warning: string;
    affectedArea: string;
    time: string;
    action: string;
    doNot: string;
    now: string;
    until: string;
    yourArea: string;
    coming: string;
  };
}

export const TEMPLATES: Record<LanguageCode, LanguageTemplate> = {
  en: {
    dangerLevel: 'Danger level',
    area: 'Area',
    time: (s, e) => `Time: from ${s} to ${e}.`,
    doNow: 'Do this now',
    doNot: 'Do NOT',
    footer: 'Simplified version. The official alert is the source of truth.',
    sms: (p) =>
      `DEMO ALERT - ${p.sev} ${p.name} WARNING: ${p.action} now. Do not ${p.doNot}. Area: ${p.area}. ${p.start}-${p.end}.`,
    labels: {
      warning: 'WARNING',
      affectedArea: 'AFFECTED AREA',
      time: 'TIME',
      action: 'ACTION',
      doNot: 'DO NOT',
      now: 'NOW',
      until: 'UNTIL',
      yourArea: 'YOUR AREA IS AFFECTED',
      coming: 'COMING',
    },
  },
  hi: {
    dangerLevel: 'खतरे का स्तर',
    area: 'क्षेत्र',
    time: (s, e) => `समय: ${s} से ${e} तक।`,
    doNow: 'अभी यह करें',
    doNot: 'यह न करें',
    footer: 'सरल संस्करण। आधिकारिक अलर्ट ही सही स्रोत है।',
    sms: (p) =>
      `डेमो अलर्ट - ${p.name} चेतावनी (${p.sev}): अभी ${p.action}। मना है: ${p.doNot}। क्षेत्र: ${p.area}। ${p.start}-${p.end}`,
    labels: {
      warning: 'चेतावनी',
      affectedArea: 'प्रभावित क्षेत्र',
      time: 'समय',
      action: 'क्या करें',
      doNot: 'क्या न करें',
      now: 'अभी',
      until: 'तक',
      yourArea: 'आपका क्षेत्र प्रभावित है',
      coming: 'आ रहा है',
    },
  },
  or: {
    dangerLevel: 'ବିପଦ ସ୍ତର',
    area: 'ଅଞ୍ଚଳ',
    time: (s, e) => `ସମୟ: ${s} ରୁ ${e} ପର୍ଯ୍ୟନ୍ତ।`,
    doNow: 'ବର୍ତ୍ତମାନ ଏହା କରନ୍ତୁ',
    doNot: 'ଏହା କରନ୍ତୁ ନାହିଁ',
    footer: 'ସରଳ ସଂସ୍କରଣ। ସରକାରୀ ସତର୍କତା ହିଁ ସଠିକ୍ ଉତ୍ସ।',
    sms: (p) =>
      `ଡେମୋ ସତର୍କତା - ${p.name} (${p.sev}): ବର୍ତ୍ତମାନ ${p.action}। ମନା: ${p.doNot}। ଅଞ୍ଚଳ: ${p.area}। ${p.start}-${p.end}`,
    labels: {
      warning: 'ସତର୍କତା',
      affectedArea: 'ପ୍ରଭାବିତ ଅଞ୍ଚଳ',
      time: 'ସମୟ',
      action: 'କଣ କରିବେ',
      doNot: 'କଣ କରିବେ ନାହିଁ',
      now: 'ବର୍ତ୍ତମାନ',
      until: 'ପର୍ଯ୍ୟନ୍ତ',
      yourArea: 'ଆପଣଙ୍କ ଅଞ୍ଚଳ ପ୍ରଭାବିତ',
      coming: 'ଆସୁଛି',
    },
  },
  bn: {
    dangerLevel: 'বিপদের মাত্রা',
    area: 'এলাকা',
    time: (s, e) => `সময়: ${s} থেকে ${e} পর্যন্ত।`,
    doNow: 'এখনই এটি করুন',
    doNot: 'এটি করবেন না',
    footer: 'সহজ সংস্করণ। সরকারি সতর্কবার্তাই সঠিক উৎস।',
    sms: (p) =>
      `ডেমো সতর্কবার্তা - ${p.name} (${p.sev}): এখনই ${p.action}। নিষেধ: ${p.doNot}। এলাকা: ${p.area}। ${p.start}-${p.end}`,
    labels: {
      warning: 'সতর্কতা',
      affectedArea: 'ক্ষতিগ্রস্ত এলাকা',
      time: 'সময়',
      action: 'কী করবেন',
      doNot: 'কী করবেন না',
      now: 'এখনই',
      until: 'পর্যন্ত',
      yourArea: 'আপনার এলাকা ক্ষতিগ্রস্ত',
      coming: 'আসছে',
    },
  },
};

export const HAZARD_LABEL: Record<HazardType, string> = {
  flood: 'Flood Warning',
  cyclone: 'Cyclone Warning',
  heat: 'Extreme Heat Warning',
  heavyRain: 'Heavy Rain Warning',
  severeWeather: 'Severe Weather Warning',
};
