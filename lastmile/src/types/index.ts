export type Severity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';

export type HazardType = 'flood' | 'cyclone' | 'heat' | 'heavyRain' | 'severeWeather';

export type LanguageCode = 'en' | 'hi' | 'or' | 'bn';

export type DemoStatus = 'SYNTHETIC_DEMO' | 'SYNTHETIC_USER_CREATED';

/** Field values for one language. Seeded alerts ship hand-authored values for every language. */
export interface LocalizedFields {
  area: string;
  action: string;
  doNot: string;
}

export interface EmergencyAlert {
  id: string;
  type: HazardType;
  severity: Severity;
  source: string;
  issuedAt: string;
  validUntil: string;
  affectedArea: string;
  recommendedAction: string;
  /** Short "do not" instruction taken from the official text. */
  doNot: string;
  originalMessage: string;
  demoStatus: DemoStatus;
  /** English phrases that must appear in the original to prove the action is present. */
  actionKeywords: string[];
  /** Phrases in the original message to highlight, by entity kind. */
  entities: Partial<Record<EntityKind, string[]>>;
  localized: Partial<Record<LanguageCode, LocalizedFields>>;
  createdAt: number;
}

export type EntityKind = 'hazard' | 'location' | 'time' | 'severity' | 'action';

export type TransformationType = 'plain' | 'translation' | 'visual' | 'sms';

/** Provenance labels shown on every piece of content. */
export type ContentKind = 'official' | 'simplified' | 'translated' | 'generated' | 'community' | 'simulated';

export type FactKey = 'hazard' | 'severity' | 'area' | 'start' | 'end' | 'action' | 'urgency';

export interface FactCheck {
  key: FactKey;
  label: string;
  expected: string[];
  passed: boolean;
}

export interface ValidationResult {
  checks: FactCheck[];
  passed: boolean;
  /** Fields that were carried over untranslated from the official English text. */
  untranslated: string[];
}

export interface AlertTransformation {
  id: string;
  alertId: string;
  parentId: string;
  type: TransformationType;
  language: LanguageCode;
  content: string;
  generatedAt: number;
  validation: ValidationResult;
  sourceType: ContentKind;
}

export type Channel = 'internet' | 'lowBandwidth' | 'sms' | 'communityRelay' | 'offlineRelay';

export type DeliveryStatus =
  | 'QUEUED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'ACKNOWLEDGED'
  | 'NEEDS_HELP'
  | 'FAILED'
  | 'RETRYING';

export type AckType = 'received' | 'understood' | 'needHelp';

export type PersonaId =
  | 'general'
  | 'lowLiteracy'
  | 'olderAdult'
  | 'visual'
  | 'hearing'
  | 'volunteer'
  | 'localLanguage';

export type AlertFormat = 'Standard' | 'Large Text' | 'Visual' | 'Icon' | 'Voice + Text' | 'Relay Package' | 'SMS';

export interface Recipient {
  id: string;
  name: string;
  persona: PersonaId;
  language: LanguageCode;
  hasSmartphone: boolean;
  hasInternet: boolean;
  relayNode: string;
}

export interface DeliveryRecord {
  id: string;
  alertId: string;
  recipient: Recipient;
  language: LanguageCode;
  format: AlertFormat;
  channel: Channel;
  channelHistory: Channel[];
  status: DeliveryStatus;
  timestamp: number;
  acknowledged: AckType | null;
  retryCount: number;
  progress: number;
  ticksInFlight: number;
  simSeconds: number;
  hops: number;
}

export type NodeStatus = 'online' | 'offline' | 'degraded';

export interface RelayNode {
  id: string;
  name: string;
  kind: 'center' | 'hub' | 'relay' | 'local' | 'cluster';
  status: NodeStatus;
  bandwidth: number;
  queue: number;
  latency: number;
  parentNode: string | null;
  forwarded: number;
}

export interface SourceSystem {
  id: string;
  name: string;
  shortName: string;
  description: string;
  issues: HazardType[];
  status: 'OPERATIONAL' | 'DEGRADED';
}

export interface CommunityNote {
  id: string;
  alertId: string;
  author: string;
  text: string;
  createdAt: number;
}

export type LogKind = 'info' | 'success' | 'warning' | 'error';

export interface ActivityEntry {
  id: string;
  time: number;
  message: string;
  kind: LogKind;
}

export interface AckSnapshot {
  tick: number;
  delivered: number;
  acknowledged: number;
  needsHelp: number;
}

export type TextSize = 'normal' | 'large' | 'xlarge';

export interface A11ySettings {
  textSize: TextSize;
  reducedMotion: boolean;
  highContrast: boolean;
}

export type VisualMode = 'standard' | 'lowLiteracy' | 'icon' | 'largeText';

export type StageId = 'source' | 'official' | 'plain' | 'translation' | 'visual' | 'delivery' | 'ack';
