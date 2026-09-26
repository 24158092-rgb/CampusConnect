import type { HazardType, LanguageCode } from '../types';

export interface Precautions {
  immediate: string[];
  before: string[];
  during: string[];
  after: string[];
}

/**
 * Standard public-safety precautions per hazard. Shown as LASTMILE guidance next to — never
 * inside — the official alert.
 */
export const PRECAUTIONS: Record<HazardType, Precautions> = {
  flood: {
    immediate: ['Move to higher ground or the upper floor now', 'Switch off electricity at the main switch', 'Never walk or drive through flood water', 'Carry ID, medicines, phone and drinking water', 'Help older neighbours and children move first'],
    before: ['Keep an emergency kit ready', 'Store important papers in a waterproof bag', 'Know your nearest shelter and route'],
    during: ['Stay away from drains, rivers and power lines', 'Drink only boiled or bottled water', 'Keep your phone charged; save battery'],
    after: ['Return home only when officials say it is safe', 'Throw away food touched by flood water', 'Watch for snakes and damaged wiring'],
  },
  cyclone: {
    immediate: ['Go to the nearest cyclone shelter now', 'Stay away from the beach and the sea', 'Keep away from windows and glass', 'Tie down or bring in loose objects', 'Keep a torch, radio and spare batteries'],
    before: ['Stock food and water for 3 days', 'Charge phones and power banks', 'Board up windows if you can'],
    during: ['Stay indoors until the official all-clear', 'The calm "eye" is not the end — stay inside', 'Avoid using lifts'],
    after: ['Keep away from fallen power lines and trees', 'Do not enter damaged buildings', 'Check on neighbours'],
  },
  heat: {
    immediate: ['Stay indoors between 12:00 and 16:00', 'Drink water often, even if not thirsty', 'Wear light, loose cotton clothes', 'Never leave children or pets in parked vehicles', 'Watch for dizziness, confusion or no sweating'],
    before: ['Keep ORS packets at home', 'Plan outdoor work for early morning', 'Know the nearest cooling centre'],
    during: ['Take cool showers; use wet cloths', 'Avoid alcohol, tea and coffee in the heat', 'Check on older adults twice a day'],
    after: ['Keep drinking water through the evening', 'Seek care if symptoms continue', 'Rest before strenuous work'],
  },
  heavyRain: {
    immediate: ['Stay away from hill slopes and river banks', 'Do not cross streams or flooded roads', 'Move away if you hear cracking or rumbling', 'Keep drains near your home clear', 'Carry a torch and phone'],
    before: ['Know landslide-prone spots near you', 'Keep an emergency bag ready', 'Clear gutters and drains'],
    during: ['Avoid travel at night', 'Listen for official updates', 'Stay away from electric poles'],
    after: ['Watch for delayed landslides', 'Report blocked roads and cracks', 'Boil drinking water'],
  },
  severeWeather: {
    immediate: ['Go indoors and stay there', 'Unplug electrical appliances', 'Stay away from trees and metal poles', 'Avoid open fields and water', 'Keep emergency contacts handy'],
    before: ['Secure loose outdoor items', 'Charge devices', 'Keep a first-aid kit ready'],
    during: ['Do not use landline phones during lightning', 'Stay off rooftops', 'Wait 30 minutes after the last thunder'],
    after: ['Report damaged power lines', 'Check for injuries', 'Follow official updates'],
  },
};

export interface Contact {
  name: string;
  number: string;
  description: string;
  real: boolean;
}

/** Real national emergency numbers in India (dialable) plus synthetic local demo contacts. */
export const EMERGENCY_CONTACTS: Contact[] = [
  { name: 'National Emergency', number: '112', description: 'Police, fire, ambulance — single emergency number', real: true },
  { name: 'Ambulance', number: '108', description: 'Medical emergency', real: true },
  { name: 'Fire', number: '101', description: 'Fire and rescue', real: true },
  { name: 'Police', number: '100', description: 'Police control room', real: true },
  { name: 'Disaster Management Helpline', number: '1078', description: 'National disaster helpline (NDMA)', real: true },
  { name: 'State Emergency Operations Centre', number: '1070', description: 'State disaster control room', real: true },
  { name: 'Women Helpline', number: '1091', description: 'Women in distress', real: true },
  { name: 'Child Helpline', number: '1098', description: 'Children in need of care', real: true },
  { name: 'Demo Shelter Coordinator', number: 'DEMO-SHELTER-01', description: 'Synthetic local contact for the demo', real: false },
  { name: 'Demo Volunteer Desk', number: 'DEMO-VOL-07', description: 'Synthetic community relay volunteer', real: false },
];

export const EMERGENCY_KIT = ['Drinking water (3 days)', 'Dry food', 'Medicines & prescriptions', 'Torch & spare batteries', 'Phone & power bank', 'ID documents in a waterproof bag', 'First-aid kit', 'Cash', 'Whistle', 'Warm clothes / blanket'];

export type SosTemplateId = 'evacuate' | 'shelter' | 'allclear';

export const SOS_TEMPLATES: Record<SosTemplateId, { label: string; text: Record<LanguageCode, string> }> = {
  evacuate: {
    label: 'Evacuate now',
    text: {
      en: 'SOS: Evacuate now. Go to the nearest shelter or higher ground. Help is coming.',
      hi: 'एसओएस: अभी खाली करें। नज़दीकी आश्रय या ऊँची जगह पर जाएँ। मदद आ रही है।',
      or: 'ଏସଓଏସ: ବର୍ତ୍ତମାନ ସ୍ଥାନ ଖାଲି କରନ୍ତୁ। ନିକଟତମ ଆଶ୍ରୟସ୍ଥଳୀ କିମ୍ବା ଉଚ୍ଚ ସ୍ଥାନକୁ ଯାଆନ୍ତୁ। ସାହାଯ୍ୟ ଆସୁଛି।',
      bn: 'এসওএস: এখনই সরে যান। নিকটতম আশ্রয়কেন্দ্র বা উঁচু জায়গায় যান। সাহায্য আসছে।',
    },
  },
  shelter: {
    label: 'Shelter in place',
    text: {
      en: 'SOS: Stay indoors. Keep away from windows. Wait for further instructions.',
      hi: 'एसओएस: घर के अंदर रहें। खिड़कियों से दूर रहें। अगले निर्देश की प्रतीक्षा करें।',
      or: 'ଏସଓଏସ: ଘର ଭିତରେ ରୁହନ୍ତୁ। ଝରକାଠାରୁ ଦୂରରେ ରୁହନ୍ତୁ। ପରବର୍ତ୍ତୀ ନିର୍ଦ୍ଦେଶକୁ ଅପେକ୍ଷା କରନ୍ତୁ।',
      bn: 'এসওএস: ঘরের ভিতরে থাকুন। জানালা থেকে দূরে থাকুন। পরবর্তী নির্দেশের জন্য অপেক্ষা করুন।',
    },
  },
  allclear: {
    label: 'All clear',
    text: {
      en: 'All clear: The danger has passed. Follow official guidance before returning home.',
      hi: 'सब सुरक्षित: खतरा टल गया है। घर लौटने से पहले आधिकारिक निर्देशों का पालन करें।',
      or: 'ସବୁ ସୁରକ୍ଷିତ: ବିପଦ ଟଳିଗଲା। ଘରକୁ ଫେରିବା ପୂର୍ବରୁ ସରକାରୀ ନିର୍ଦ୍ଦେଶ ମାନନ୍ତୁ।',
      bn: 'সব নিরাপদ: বিপদ কেটে গেছে। বাড়ি ফেরার আগে সরকারি নির্দেশ মেনে চলুন।',
    },
  },
};
