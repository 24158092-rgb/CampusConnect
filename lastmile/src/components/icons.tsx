import type { LucideIcon } from 'lucide-react';
import { Ban, Clock, CloudLightning, CloudRain, Footprints, MapPin, ThermometerSun, Tornado, Waves } from 'lucide-react';
import type { HazardType } from '../types';
import type { FactIconKind } from '../utils/content';
import { cx } from './ui';

export const HAZARD_LUCIDE: Record<HazardType, LucideIcon> = {
  flood: Waves,
  cyclone: Tornado,
  heat: ThermometerSun,
  heavyRain: CloudRain,
  severeWeather: CloudLightning,
};

const FACT_LUCIDE: Record<Exclude<FactIconKind, 'hazard'>, LucideIcon> = {
  location: MapPin,
  time: Clock,
  action: Footprints,
  donot: Ban,
};

/** Line-icon tile used instead of emoji pictographs. */
export function HazardIcon({ type, className, tile = true }: { type: HazardType; className?: string; tile?: boolean }) {
  const Icon = HAZARD_LUCIDE[type];
  if (!tile) return <Icon aria-hidden className={className} strokeWidth={2.2} />;
  return (
    <span aria-hidden className={cx('inline-grid shrink-0 place-items-center rounded-xl bg-white/10 text-white', className ?? 'size-12')}>
      <Icon className="size-[55%]" strokeWidth={2.2} />
    </span>
  );
}

export function FactIcon({ kind, hazard, className }: { kind: FactIconKind; hazard: HazardType; className?: string }) {
  if (kind === 'hazard') return <HazardIcon type={hazard} className={className} />;
  const Icon = FACT_LUCIDE[kind];
  const tone = { location: 'bg-sky-500/20 text-sky-200', time: 'bg-amber-500/20 text-amber-200', action: 'bg-emerald-500/20 text-emerald-200', donot: 'bg-red-500/25 text-red-200' }[kind];
  return (
    <span aria-hidden className={cx('inline-grid shrink-0 place-items-center rounded-xl', tone, className ?? 'size-12')}>
      <Icon className="size-[55%]" strokeWidth={2.2} />
    </span>
  );
}
