import { FALLBACK_CHAIN } from '../data/network';
import type { AlertFormat, Channel, PersonaId, Recipient } from '../types';

export interface NetworkProfile {
  label: string;
  latencyMs: number;
  lossRate: number;
  /** Simulated throughput in kbit/s. */
  kbps: number;
  status: 'NORMAL' | 'SLOW' | 'DEGRADED CONNECTION' | 'CRITICAL';
}

/** Maps the network-quality slider (0–100) to deterministic demo network characteristics. */
export function networkProfile(quality: number): NetworkProfile {
  if (quality >= 80) return { label: 'Normal', latencyMs: 80, lossRate: 0.02, kbps: 8000, status: 'NORMAL' };
  if (quality >= 50) return { label: 'Slow', latencyMs: 420, lossRate: 0.08, kbps: 900, status: 'SLOW' };
  if (quality >= 20) return { label: 'Very Slow', latencyMs: 1600, lossRate: 0.22, kbps: 64, status: 'DEGRADED CONNECTION' };
  return { label: 'Critical', latencyMs: 4200, lossRate: 0.45, kbps: 9.6, status: 'CRITICAL' };
}

export interface ChannelRecommendation {
  channel: Channel;
  reason: string;
}

/**
 * DEMO CHANNEL RECOMMENDATION — simple rules over synthetic recipient/network properties.
 * Not a real-world emergency routing algorithm.
 */
export function recommendChannel(r: Recipient, quality: number, internetOutage: boolean): ChannelRecommendation {
  if (r.persona === 'volunteer') return { channel: 'communityRelay', reason: 'Local volunteer → Relay Package' };
  if (!r.hasSmartphone && !r.hasInternet) return { channel: 'communityRelay', reason: 'No phone or internet → Community Relay' };
  if (!r.hasInternet || internetOutage) return { channel: 'sms', reason: 'No internet → SMS' };
  if (quality >= 50) return { channel: 'internet', reason: 'Internet available → Internet + App' };
  if (quality >= 20) return { channel: 'lowBandwidth', reason: 'Low bandwidth → compressed text' };
  return { channel: 'sms', reason: 'Critical bandwidth → SMS' };
}

/** Next channel in the fallback chain, or null if the chain is exhausted. */
export function nextFallback(channel: Channel): Channel | null {
  const from = channel === 'lowBandwidth' ? 0 : FALLBACK_CHAIN.indexOf(channel);
  return FALLBACK_CHAIN[from + 1] ?? null;
}

export const isRelayChannel = (c: Channel) => c === 'communityRelay' || c === 'offlineRelay';

export const FORMAT_FOR_PERSONA: Record<PersonaId, AlertFormat> = {
  general: 'Standard',
  lowLiteracy: 'Visual',
  olderAdult: 'Large Text',
  visual: 'Voice + Text',
  hearing: 'Icon',
  volunteer: 'Relay Package',
  localLanguage: 'Standard',
};
