import type { EmergencyAlert } from '../types';

/**
 * SYNTHETIC DEMO DATA — NOT A REAL EMERGENCY ALERT.
 * Every place, time, source and message below is invented for the hackathon demo.
 */
export const SEED_ALERTS: EmergencyAlert[] = [
  {
    id: 'FLD-DEMO-001',
    type: 'flood',
    severity: 'HIGH',
    source: 'src-met',
    issuedAt: '18:30',
    validUntil: '22:30',
    affectedArea: 'Demo Coastal District',
    recommendedAction: 'Move to higher ground and avoid flooded roads.',
    doNot: 'walk or drive through flood water',
    demoStatus: 'SYNTHETIC_DEMO',
    createdAt: 0,
    originalMessage:
      'FLASH FLOOD WARNING [SYNTHETIC DEMO]. Issued 18:30 by the Demo Meteorological Department. ' +
      'Owing to intense convective precipitation over the upper catchment and anticipated riverine overflow, ' +
      'significant inundation of low-lying areas of Demo Coastal District is forecast between 18:30 and 22:30. ' +
      'Severity: HIGH. Residents within the designated low-lying zones are advised to evacuate immediately and ' +
      'relocate to higher ground. Vehicular and pedestrian movement through inundated carriageways must be avoided.',
    actionKeywords: ['higher ground'],
    entities: {
      hazard: ['FLASH FLOOD WARNING', 'inundation', 'riverine overflow', 'Flash flooding'],
      location: ['Demo Coastal District', 'low-lying zones', 'low-lying areas'],
      time: ['18:30', '22:30'],
      severity: ['Severity: HIGH', 'HIGH'],
      action: ['evacuate immediately', 'relocate to higher ground', 'Move to higher ground', 'must be avoided', 'walk or drive through flood water'],
    },
    localized: {
      en: { area: 'Demo Coastal District', action: 'Move to higher ground', doNot: 'walk or drive through flood water' },
      hi: { area: 'डेमो तटीय जिला', action: 'ऊँची जगह पर जाएँ', doNot: 'बाढ़ के पानी में चलना या गाड़ी चलाना' },
      or: { area: 'ଡେମୋ ଉପକୂଳ ଜିଲ୍ଲା', action: 'ଉଚ୍ଚ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ', doNot: 'ବନ୍ୟା ପାଣିରେ ଚାଲିବା ବା ଗାଡ଼ି ଚଲାଇବା' },
      bn: { area: 'ডেমো উপকূলীয় জেলা', action: 'উঁচু জায়গায় চলে যান', doNot: 'বন্যার জলে হাঁটা বা গাড়ি চালানো' },
    },
  },
  {
    id: 'CYC-DEMO-002',
    type: 'cyclone',
    severity: 'CRITICAL',
    source: 'src-dma',
    issuedAt: '09:00',
    validUntil: '21:00',
    affectedArea: 'Demo Bay Coast (Zones 1–4)',
    recommendedAction: 'Go to the nearest cyclone shelter. Stay away from the sea.',
    doNot: 'go to the beach or out to sea',
    demoStatus: 'SYNTHETIC_DEMO',
    createdAt: 0,
    originalMessage:
      'CYCLONE WARNING — RED CATEGORY [SYNTHETIC DEMO]. Issued 09:00 by the Demo Disaster Management Authority. ' +
      'A severe cyclonic storm is projected to make landfall along Demo Bay Coast (Zones 1–4) with sustained wind ' +
      'speeds of 110–120 km/h and storm surge of 1.5–2 m above astronomical tide, valid from 09:00 until 21:00. ' +
      'Severity: CRITICAL. The population in coastal Zones 1–4 must immediately proceed to the nearest designated cyclone shelter. ' +
      'Fishing operations are totally suspended; do not venture to the beach or out to sea.',
    actionKeywords: ['cyclone shelter'],
    entities: {
      hazard: ['CYCLONE WARNING', 'severe cyclonic storm', 'storm surge', 'cyclone'],
      location: ['Demo Bay Coast (Zones 1–4)', 'coastal Zones 1–4'],
      time: ['09:00', '21:00'],
      severity: ['RED CATEGORY', 'Severity: CRITICAL', 'CRITICAL'],
      action: ['proceed to the nearest designated cyclone shelter', 'Go to the nearest cyclone shelter', 'do not venture to the beach or out to sea', 'go to the beach or out to sea'],
    },
    localized: {
      en: { area: 'Demo Bay Coast (Zones 1–4)', action: 'Go to the nearest cyclone shelter', doNot: 'go to the beach or out to sea' },
      hi: { area: 'डेमो खाड़ी तट (ज़ोन 1–4)', action: 'नज़दीकी चक्रवात आश्रय में जाएँ', doNot: 'समुद्र तट या समुद्र में जाना' },
      or: { area: 'ଡେମୋ ଉପସାଗର ଉପକୂଳ (ଜୋନ୍ 1–4)', action: 'ନିକଟତମ ବାତ୍ୟା ଆଶ୍ରୟସ୍ଥଳୀକୁ ଯାଆନ୍ତୁ', doNot: 'ସମୁଦ୍ର କୂଳ କିମ୍ବା ସମୁଦ୍ରକୁ ଯିବା' },
      bn: { area: 'ডেমো উপসাগর উপকূল (জোন 1–4)', action: 'নিকটতম ঘূর্ণিঝড় আশ্রয়কেন্দ্রে যান', doNot: 'সমুদ্র সৈকতে বা সমুদ্রে যাওয়া' },
    },
  },
  {
    id: 'HEAT-DEMO-003',
    type: 'heat',
    severity: 'WARNING',
    source: 'src-eoc',
    issuedAt: '07:00',
    validUntil: '19:00',
    affectedArea: 'Demo Inland City',
    recommendedAction: 'Stay indoors, drink water often, avoid the sun from 12:00 to 16:00.',
    doNot: 'work in direct sun from 12:00 to 16:00',
    demoStatus: 'SYNTHETIC_DEMO',
    createdAt: 0,
    originalMessage:
      'HEAT WAVE ADVISORY — ORANGE LEVEL [SYNTHETIC DEMO]. Issued 07:00 by the Demo Local Emergency Operations Center. ' +
      'Maximum ambient temperatures of 44–46 °C with elevated humidity index are anticipated across Demo Inland City ' +
      'from 07:00 to 19:00. Severity: WARNING. Heat-related illness risk is elevated for vulnerable populations. ' +
      'The public is advised to remain indoors now, maintain adequate oral hydration at frequent intervals, and refrain from strenuous ' +
      'outdoor exertion in direct sun from 12:00 to 16:00.',
    actionKeywords: ['remain indoors', 'hydration'],
    entities: {
      hazard: ['HEAT WAVE ADVISORY', 'Heat-related illness', 'temperatures of 44–46 °C', 'Extreme heat'],
      location: ['Demo Inland City'],
      time: ['07:00', '19:00', '12:00 to 16:00'],
      severity: ['ORANGE LEVEL', 'Severity: WARNING', 'WARNING'],
      action: ['remain indoors', 'adequate oral hydration', 'Stay indoors and drink water often', 'work in direct sun from 12:00 to 16:00'],
    },
    localized: {
      en: { area: 'Demo Inland City', action: 'Stay indoors and drink water often', doNot: 'work in direct sun from 12:00 to 16:00' },
      hi: { area: 'डेमो अंतर्देशीय शहर', action: 'घर के अंदर रहें और बार-बार पानी पिएँ', doNot: '12:00 से 16:00 तक सीधी धूप में काम करना' },
      or: { area: 'ଡେମୋ ଅନ୍ତର୍ଦେଶୀୟ ସହର', action: 'ଘର ଭିତରେ ରୁହନ୍ତୁ ଏବଂ ବାରମ୍ବାର ପାଣି ପିଅନ୍ତୁ', doNot: '12:00 ରୁ 16:00 ପର୍ଯ୍ୟନ୍ତ ସିଧା ଖରାରେ କାମ କରିବା' },
      bn: { area: 'ডেমো অভ্যন্তরীণ শহর', action: 'ঘরের ভিতরে থাকুন এবং বারবার জল পান করুন', doNot: '12:00 থেকে 16:00 পর্যন্ত সরাসরি রোদে কাজ করা' },
    },
  },
  {
    id: 'RAIN-DEMO-004',
    type: 'heavyRain',
    severity: 'HIGH',
    source: 'src-mun',
    issuedAt: '16:00',
    validUntil: '23:00',
    affectedArea: 'Demo Hill Region',
    recommendedAction: 'Stay away from hill slopes and rivers.',
    doNot: 'cross streams or landslide-prone roads',
    demoStatus: 'SYNTHETIC_DEMO',
    createdAt: 0,
    originalMessage:
      'HEAVY RAINFALL WARNING [SYNTHETIC DEMO]. Issued 16:00 by the Demo Municipal Warning System. ' +
      'Extremely heavy rainfall (≥ 204.5 mm/24 h) is likely over Demo Hill Region between 16:00 and 23:00, with attendant ' +
      'risk of landslides and flash floods in hilly terrain. Severity: HIGH. Residents are advised to stay away from hill slopes and rivers ' +
      'immediately and to refrain from traversing streams or landslide-prone roads.',
    actionKeywords: ['stay away from hill slopes and rivers'],
    entities: {
      hazard: ['HEAVY RAINFALL WARNING', 'Extremely heavy rainfall', 'landslides', 'heavy rain'],
      location: ['Demo Hill Region', 'hilly terrain'],
      time: ['16:00', '23:00'],
      severity: ['Severity: HIGH', 'HIGH'],
      action: ['stay away from hill slopes and rivers', 'Stay away from hill slopes and rivers', 'refrain from traversing streams or landslide-prone roads', 'cross streams or landslide-prone roads'],
    },
    localized: {
      en: { area: 'Demo Hill Region', action: 'Stay away from hill slopes and rivers', doNot: 'cross streams or landslide-prone roads' },
      hi: { area: 'डेमो पहाड़ी क्षेत्र', action: 'पहाड़ी ढलानों और नदियों से दूर रहें', doNot: 'नाले या भूस्खलन वाली सड़कें पार करना' },
      or: { area: 'ଡେମୋ ପାହାଡ଼ିଆ ଅଞ୍ଚଳ', action: 'ପାହାଡ଼ ଢାଲୁ ଏବଂ ନଦୀଠାରୁ ଦୂରରେ ରୁହନ୍ତୁ', doNot: 'ନାଳ କିମ୍ବା ଭୂସ୍ଖଳନ ପ୍ରବଣ ରାସ୍ତା ପାର ହେବା' },
      bn: { area: 'ডেমো পাহাড়ি অঞ্চল', action: 'পাহাড়ের ঢাল ও নদী থেকে দূরে থাকুন', doNot: 'খাল বা ভূমিধসপ্রবণ রাস্তা পার হওয়া' },
    },
  },
];
