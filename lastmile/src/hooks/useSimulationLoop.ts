import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const TICK_MS = 800;

/** Drives the deterministic delivery simulation while it is running. */
export function useSimulationLoop() {
  const running = useStore((s) => s.simRunning);
  const tick = useStore((s) => s.tick);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(tick, TICK_MS);
    return () => window.clearInterval(id);
  }, [running, tick]);
}
