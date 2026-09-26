import type { HazardType, LanguageCode, Severity } from '../types';

/** A message pushed from the admin console to resident screens (other tabs / windows). */
export interface IncomingMessage {
  id: string;
  kind: 'alert' | 'sos';
  severity: Severity;
  hazard: HazardType;
  alertId: string;
  title: string;
  text: Record<LanguageCode, string>;
  zones: string[] | 'all';
  at: number;
}

export type BusMessage =
  | { type: 'broadcast'; message: IncomingMessage }
  | { type: 'response'; personId: number; name: string; safe: boolean; broadcastId: string };

const KEY = 'lastmile-bus';
const LAST = 'lastmile-last-message';
let channel: BroadcastChannel | null = null;
try {
  channel = 'BroadcastChannel' in window ? new BroadcastChannel('lastmile') : null;
} catch {
  channel = null;
}

/** Sends to every other open LastMile tab (BroadcastChannel, with a localStorage-event fallback). */
export function postBus(msg: BusMessage) {
  channel?.postMessage(msg);
  try {
    localStorage.setItem(KEY, JSON.stringify({ msg, nonce: Math.random() }));
    if (msg.type === 'broadcast') localStorage.setItem(LAST, JSON.stringify(msg.message));
  } catch {
    /* storage may be unavailable */
  }
}

export function onBus(cb: (msg: BusMessage) => void) {
  const seen = new Set<string>();
  const handle = (msg: BusMessage) => {
    const key = msg.type === 'broadcast' ? `b-${msg.message.id}` : `r-${msg.broadcastId}-${msg.personId}-${msg.safe}`;
    if (seen.has(key)) return;
    seen.add(key);
    cb(msg);
  };
  const onMessage = (e: MessageEvent<BusMessage>) => handle(e.data);
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      handle(JSON.parse(e.newValue).msg);
    } catch {
      /* ignore malformed */
    }
  };
  channel?.addEventListener('message', onMessage);
  window.addEventListener('storage', onStorage);
  return () => {
    channel?.removeEventListener('message', onMessage);
    window.removeEventListener('storage', onStorage);
  };
}

export function lastMessage(): IncomingMessage | null {
  try {
    const raw = localStorage.getItem(LAST);
    return raw ? (JSON.parse(raw) as IncomingMessage) : null;
  } catch {
    return null;
  }
}
