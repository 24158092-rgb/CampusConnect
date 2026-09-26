import { useMemo } from 'react';
import { STAGES } from '../data/stages';
import { useStore } from '../store/useStore';
import type { StageId } from '../types';

export type StageState = 'complete' | 'active' | 'pending';

/** Derives each pipeline stage's state for an alert from the artifacts that exist in the store. */
export function usePipeline(alertId: string) {
  const validated = useStore((s) => s.validatedAt[alertId]);
  const transformations = useStore((s) => s.transformations);
  const deliveries = useStore((s) => s.deliveries);

  return useMemo(() => {
    const ts = transformations.filter((t) => t.alertId === alertId);
    const ds = deliveries.filter((d) => d.alertId === alertId);
    const done: Record<StageId, boolean> = {
      source: true,
      official: Boolean(validated),
      plain: ts.some((t) => t.type === 'plain'),
      translation: ts.some((t) => t.type === 'translation'),
      visual: ts.some((t) => t.type === 'visual'),
      delivery: ds.length > 0 && ds.some((d) => d.status !== 'QUEUED'),
      ack: ds.some((d) => d.acknowledged),
    };
    const firstPending = STAGES.findIndex((s) => !done[s.id]);
    const states = Object.fromEntries(
      STAGES.map((s, i) => [s.id, done[s.id] ? 'complete' : i === firstPending ? 'active' : 'pending']),
    ) as Record<StageId, StageState>;
    const completed = STAGES.filter((s) => done[s.id]).length;
    return { states, completed, total: STAGES.length };
  }, [alertId, validated, transformations, deliveries]);
}
