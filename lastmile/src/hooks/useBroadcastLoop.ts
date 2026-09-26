import { useEffect } from 'react';
import { useBroadcast } from '../store/useBroadcast';
import { toast } from '../store/useToasts';
import { onBus } from '../utils/bus';

export const BROADCAST_TICK_MS = 600;

/** Drives the large-scale broadcast simulation and tracks real browser connectivity. */
export function useBroadcastLoop() {
  const running = useBroadcast((s) => Boolean(s.broadcast?.running));
  const tick = useBroadcast((s) => s.tick);
  const setBrowserOnline = useBroadcast((s) => s.setBrowserOnline);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, BROADCAST_TICK_MS);
    return () => window.clearInterval(id);
  }, [running, tick]);

  // Replies coming back from resident screens in other tabs.
  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type !== 'response') return;
        useBroadcast.getState().respondPerson(msg.personId, msg.safe, msg.name);
        toast(`${msg.name} (resident) replied: ${msg.safe ? 'I am safe' : 'I NEED HELP'}`, msg.safe ? 'success' : 'error');
      }),
    [],
  );

  useEffect(() => {
    const on = () => setBrowserOnline(true);
    const off = () => setBrowserOnline(false);
    setBrowserOnline(navigator.onLine);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [setBrowserOnline]);
}
