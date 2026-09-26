import type { LucideIcon } from 'lucide-react';
import { CircleCheck, Image, Languages, Megaphone, RadioTower, Send, Sparkles } from 'lucide-react';
import type { StageId } from '../types';

export interface StageDef {
  id: StageId;
  label: string;
  short: string;
  module: string;
  route: string;
  description: string;
  icon: LucideIcon;
  tone: 'cyan' | 'blue' | 'teal' | 'green' | 'amber' | 'orange' | 'red';
}

/** The mandatory flow: Source Systems → Official Alert → Plain Language → Translation → Visual → Simulated Delivery → Acknowledgement. */
export const STAGES: StageDef[] = [
  { id: 'source', label: 'Source Systems', short: 'SOURCE', module: 'Source Systems', route: '/alerts', description: 'Synthetic agencies issue the warning.', icon: RadioTower, tone: 'cyan' },
  { id: 'official', label: 'Official Alert', short: 'OFFICIAL', module: 'Official Alert', route: '/official', description: 'Initial creation and formal issuance of the warning message.', icon: Megaphone, tone: 'blue' },
  { id: 'plain', label: 'Plain Language', short: 'CLARITY', module: 'Clarity Processor', route: '/clarity', description: 'Reframing content to be clear, simple and jargon-free.', icon: Sparkles, tone: 'teal' },
  { id: 'translation', label: 'Translation', short: 'LANGUAGE', module: 'Language Bank', route: '/language', description: 'Converting the simplified message into local languages.', icon: Languages, tone: 'green' },
  { id: 'visual', label: 'Visual Version', short: 'VISUAL', module: 'Visual Studio', route: '/visual', description: 'Illustrated, icon-based and low-literacy versions.', icon: Image, tone: 'amber' },
  { id: 'delivery', label: 'Simulated Delivery', short: 'DELIVERY', module: 'Delivery Simulator', route: '/delivery', description: 'Testing transmission through network simulation models.', icon: Send, tone: 'orange' },
  { id: 'ack', label: 'Acknowledgement', short: 'RECEIPT', module: 'Receipt Tracker', route: '/receipts', description: 'Monitoring receipt and read status of all targets.', icon: CircleCheck, tone: 'red' },
];
