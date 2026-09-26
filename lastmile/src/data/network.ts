import type { AlertFormat, Channel, PersonaId, Recipient, RelayNode, SourceSystem } from '../types';

/** DEMO labels only — none of these are real agencies. */
export const SOURCE_SYSTEMS: SourceSystem[] = [
  {
    id: 'src-met',
    name: 'Demo Meteorological Department',
    shortName: 'DEMO-MET',
    description: 'Synthetic weather forecasting feed: floods, heavy rain, cyclones.',
    issues: ['flood', 'heavyRain', 'cyclone'],
    status: 'OPERATIONAL',
  },
  {
    id: 'src-dma',
    name: 'Demo Disaster Management Authority',
    shortName: 'DEMO-DMA',
    description: 'Synthetic regional authority issuing evacuation-level warnings.',
    issues: ['cyclone', 'flood'],
    status: 'OPERATIONAL',
  },
  {
    id: 'src-eoc',
    name: 'Demo Local Emergency Operations Center',
    shortName: 'DEMO-EOC',
    description: 'Synthetic city-level operations desk for heat and public-health advisories.',
    issues: ['heat', 'severeWeather'],
    status: 'OPERATIONAL',
  },
  {
    id: 'src-mun',
    name: 'Demo Municipal Warning System',
    shortName: 'DEMO-MUN',
    description: 'Synthetic municipal sirens and notice feed.',
    issues: ['heavyRain', 'flood'],
    status: 'OPERATIONAL',
  },
  {
    id: 'src-com',
    name: 'Demo Community Alert System',
    shortName: 'DEMO-COM',
    description: 'Synthetic volunteer network. Relays official alerts; its own notes are never merged into them.',
    issues: ['flood', 'cyclone', 'heat', 'heavyRain', 'severeWeather'],
    status: 'DEGRADED',
  },
];

export const sourceById = (id: string): SourceSystem =>
  SOURCE_SYSTEMS.find((s) => s.id === id) ?? { ...SOURCE_SYSTEMS[0], id, name: 'User-created demo source', shortName: 'DEMO-USER' };

export interface Persona {
  id: PersonaId;
  label: string;
  description: string;
  format: AlertFormat;
  traits: string[];
}

export const PERSONAS: Persona[] = [
  { id: 'general', label: 'General Public', description: 'Standard plain-language text.', format: 'Standard', traits: ['Plain language', 'Clear structure', 'Official link'] },
  { id: 'lowLiteracy', label: 'Low-Literacy User', description: 'Very large text, icons, numbered actions.', format: 'Visual', traits: ['Very large text', 'Short sentences', 'Icons', 'Numbered actions'] },
  { id: 'olderAdult', label: 'Older Adult', description: 'Larger type, high contrast, one clear action.', format: 'Large Text', traits: ['Larger typography', 'High contrast', 'Fewer elements', 'One clear action'] },
  { id: 'visual', label: 'Visual Accessibility', description: 'Strong contrast, screen-reader labels, voice playback.', format: 'Voice + Text', traits: ['Strong contrast', 'Text alternatives', 'Screen-reader labels', 'Voice playback'] },
  { id: 'hearing', label: 'Hearing Accessibility', description: 'Everything in text and icons, visual flash cue, no audio dependence.', format: 'Icon', traits: ['No audio dependence', 'Visual flash cue', 'Captions / text first'] },
  { id: 'volunteer', label: 'Local Community Volunteer', description: 'Relay instructions, target group, acknowledgement collection.', format: 'Relay Package', traits: ['Relay instructions', 'Location', 'Target group', 'Ack collection'] },
  { id: 'localLanguage', label: 'Local-Language User', description: 'Alert in the recipient’s own language.', format: 'Standard', traits: ['Native script', 'Plain language', 'Translated demo content'] },
];

export const personaById = (id: PersonaId): Persona => PERSONAS.find((p) => p.id === id) ?? PERSONAS[0];

/** Synthetic recipients. */
export const RECIPIENTS: Recipient[] = [
  { id: 'P001', name: 'Person 001', persona: 'lowLiteracy', language: 'hi', hasSmartphone: false, hasInternet: false, relayNode: 'relay-a' },
  { id: 'P002', name: 'Person 002', persona: 'general', language: 'en', hasSmartphone: true, hasInternet: true, relayNode: 'relay-a' },
  { id: 'P003', name: 'Person 003', persona: 'lowLiteracy', language: 'or', hasSmartphone: false, hasInternet: false, relayNode: 'relay-b' },
  { id: 'P004', name: 'Person 004', persona: 'olderAdult', language: 'bn', hasSmartphone: true, hasInternet: false, relayNode: 'relay-a' },
  { id: 'P005', name: 'Person 005', persona: 'localLanguage', language: 'or', hasSmartphone: true, hasInternet: true, relayNode: 'relay-b' },
  { id: 'P006', name: 'Person 006', persona: 'visual', language: 'en', hasSmartphone: true, hasInternet: true, relayNode: 'relay-a' },
  { id: 'P007', name: 'Person 007', persona: 'olderAdult', language: 'hi', hasSmartphone: false, hasInternet: false, relayNode: 'relay-b' },
  { id: 'P008', name: 'Person 008', persona: 'volunteer', language: 'or', hasSmartphone: true, hasInternet: true, relayNode: 'relay-b' },
  { id: 'P009', name: 'Person 009', persona: 'hearing', language: 'bn', hasSmartphone: true, hasInternet: true, relayNode: 'relay-a' },
  { id: 'P010', name: 'Person 010', persona: 'general', language: 'hi', hasSmartphone: true, hasInternet: true, relayNode: 'relay-a' },
  { id: 'P011', name: 'Person 011', persona: 'localLanguage', language: 'bn', hasSmartphone: false, hasInternet: false, relayNode: 'relay-b' },
  { id: 'P012', name: 'Person 012', persona: 'volunteer', language: 'hi', hasSmartphone: true, hasInternet: true, relayNode: 'relay-a' },
];

export const INITIAL_NODES: RelayNode[] = [
  { id: 'center', name: 'Emergency Center (Demo)', kind: 'center', status: 'online', bandwidth: 100, queue: 0, latency: 20, parentNode: null, forwarded: 0 },
  { id: 'hub', name: 'District Hub', kind: 'hub', status: 'online', bandwidth: 80, queue: 0, latency: 60, parentNode: 'center', forwarded: 0 },
  { id: 'relay-a', name: 'Community Relay A', kind: 'relay', status: 'online', bandwidth: 40, queue: 0, latency: 180, parentNode: 'hub', forwarded: 0 },
  { id: 'relay-b', name: 'Community Relay B', kind: 'relay', status: 'offline', bandwidth: 25, queue: 0, latency: 320, parentNode: 'hub', forwarded: 0 },
  { id: 'local', name: 'Local Relay (Volunteer Radio)', kind: 'local', status: 'online', bandwidth: 15, queue: 0, latency: 450, parentNode: 'relay-a', forwarded: 0 },
  { id: 'cluster', name: 'Recipient Cluster', kind: 'cluster', status: 'degraded', bandwidth: 10, queue: 0, latency: 600, parentNode: 'local', forwarded: 0 },
];

export const CHANNEL_LABEL: Record<Channel, string> = {
  internet: 'Normal Internet',
  lowBandwidth: 'Low Bandwidth',
  sms: 'SMS Simulation',
  communityRelay: 'Community Relay',
  offlineRelay: 'Offline Relay',
};

/** Demo fallback chain: Internet → SMS → Community Relay → Offline Queue. */
export const FALLBACK_CHAIN: Channel[] = ['internet', 'sms', 'communityRelay', 'offlineRelay'];

export const PAYLOAD_BYTES: Record<Channel, number> = {
  internet: 240_000,
  lowBandwidth: 1_200,
  sms: 280,
  communityRelay: 900,
  offlineRelay: 900,
};
