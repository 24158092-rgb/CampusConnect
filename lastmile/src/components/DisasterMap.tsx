import type { LucideIcon } from 'lucide-react';
import { Cross, Droplets, Flag, House, Plane, Utensils } from 'lucide-react';
import { useMemo } from 'react';
import { EVAC_ROUTES, RELIEF_SITES, RISK_LABEL, RIVER_PATH, SEA_PATH, ZONES, ZONE_RISK, siteUsable, type ReliefKind, type ReliefSite } from '../data/geo';
import { ST, useBroadcast } from '../store/useBroadcast';
import type { HazardType } from '../types';
import { cx } from './ui';

export const RELIEF_ICON: Record<ReliefKind, LucideIcon> = { shelter: House, medical: Cross, food: Utensils, water: Droplets, assembly: Flag, helipad: Plane };
export const RELIEF_COLOR: Record<ReliefKind, string> = { shelter: '#86bf9f', medical: '#e06a55', food: '#dcb866', water: '#6fb3e0', assembly: '#b6aea1', helipad: '#ece6da' };
const RISK_FILL = ['rgb(0 0 0 / 0)', 'rgb(220 184 102 / 0.12)', 'rgb(220 149 91 / 0.22)', 'rgb(224 106 85 / 0.32)', 'rgb(224 106 85 / 0.5)'];
export const STATUS_COLOR = ['#8a8378', '#dcb866', '#3987e5', '#86bf9f', '#e06a55', '#dcb866', '#6b645b'];

export interface MapLayers {
  hazard: boolean;
  relief: boolean;
  routes: boolean;
  people: boolean;
}

/** Shelter load = baseline + residents from high-risk zones who marked themselves safe (assigned to the nearest usable shelter). */
export function useShelterLoad(hazard: HazardType) {
  const dataset = useBroadcast((s) => s.dataset);
  const broadcast = useBroadcast((s) => s.broadcast);
  return useMemo(() => {
    const load: Record<string, number> = Object.fromEntries(RELIEF_SITES.map((r) => [r.id, r.baseOccupancy]));
    const shelters = RELIEF_SITES.filter((r) => r.kind === 'shelter' && siteUsable(r, hazard));
    if (!broadcast || !shelters.length) return load;
    broadcast.targets.forEach((idx, k) => {
      if (broadcast.status[k] !== ST.SAFE) return;
      const p = dataset[idx];
      if (!p || ZONE_RISK[hazard][p.zone] < 3) return;
      let best = shelters[0];
      let bestD = Infinity;
      for (const s of shelters) {
        const d = (s.x - p.x) ** 2 + (s.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = s;
        }
      }
      load[best.id] += 1;
    });
    return load;
  }, [dataset, broadcast, hazard]);
}

export function DisasterMap({
  hazard,
  layers = { hazard: true, relief: true, routes: true, people: true },
  selectedSite,
  onSelectSite,
  className,
  maxDots = 1500,
  highlight,
}: {
  hazard: HazardType;
  layers?: MapLayers;
  selectedSite?: string | null;
  onSelectSite?: (site: ReliefSite) => void;
  className?: string;
  maxDots?: number;
  highlight?: { x: number; y: number };
}) {
  const dataset = useBroadcast((s) => s.dataset);
  const broadcast = useBroadcast((s) => s.broadcast);
  const risk = ZONE_RISK[hazard];

  const dots = useMemo(() => {
    const statusByPerson = new Map<number, number>();
    broadcast?.targets.forEach((idx, k) => statusByPerson.set(idx, broadcast.status[k]));
    const step = Math.max(1, Math.ceil(dataset.length / maxDots));
    const out: { x: number; y: number; c: string }[] = [];
    for (let i = 0; i < dataset.length; i += step) {
      const st = statusByPerson.get(i);
      out.push({ x: dataset[i].x, y: dataset[i].y, c: st === undefined ? '#6b645b' : STATUS_COLOR[st] });
    }
    return out;
  }, [dataset, broadcast, maxDots]);

  const affected = ZONES.filter((z) => risk[z.id] >= 3).map((z) => z.name);

  return (
    <svg
      viewBox="0 0 1000 640"
      className={cx('w-full rounded-xl', className)}
      role="img"
      aria-label={`Schematic map of Demo Coastal District. High-risk zones: ${affected.join(', ') || 'none'}. ${RELIEF_SITES.length} relief sites shown.`}
    >
      <defs>
        <pattern id="map-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="rgb(236 230 218 / 0.04)" />
        </pattern>
        <pattern id="severe-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="10" stroke="rgb(224 106 85 / 0.55)" strokeWidth="3" />
        </pattern>
      </defs>
      <rect width="1000" height="640" fill="#1c1b18" />
      <rect width="1000" height="640" fill="url(#map-grid)" />
      <path d={SEA_PATH} fill="#17222c" />
      <text x="900" y="320" fill="#4d6477" fontSize="18" fontWeight="700" textAnchor="middle">BAY (SEA)</text>

      {ZONES.map((z) => {
        const pts = z.points.map((p) => p.join(',')).join(' ');
        const r = risk[z.id];
        return (
          <g key={z.id}>
            <polygon points={pts} fill={layers.hazard ? RISK_FILL[r] : 'transparent'} stroke="rgb(236 230 218 / 0.18)" strokeWidth="1.5" />
            {layers.hazard && r === 4 && <polygon points={pts} fill="url(#severe-hatch)" opacity="0.5" />}
          </g>
        );
      })}

      <path d={RIVER_PATH} fill="none" stroke="#2c4a63" strokeWidth="12" strokeLinecap="round" />
      <path d={RIVER_PATH} fill="none" stroke="#3b6485" strokeWidth="4" strokeLinecap="round" />

      {/* Main roads */}
      <path d="M0,560 L1000,560 M470,0 L470,640 M0,210 L800,210" stroke="rgb(236 230 218 / 0.08)" strokeWidth="6" fill="none" />

      {layers.people &&
        dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={2.4} fill={d.c} opacity={0.85} />)}

      {layers.routes &&
        EVAC_ROUTES.filter((r) => risk[r.from] >= 3).map((r) => (
          <g key={r.id}>
            <polyline points={r.points.map((p) => p.join(',')).join(' ')} fill="none" stroke="#86bf9f" strokeWidth="4" strokeDasharray="10 8" strokeLinecap="round" markerEnd="url(#arrow)" />
          </g>
        ))}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="#86bf9f" />
        </marker>
      </defs>

      {ZONES.map((z) => (
        <g key={`${z.id}-label`} transform={`translate(${z.label[0]} ${z.label[1]})`}>
          <text textAnchor="middle" fill="#ece6da" fontSize="16" fontWeight="700" stroke="#1c1b18" strokeWidth="4" paintOrder="stroke">
            {z.name}
          </text>
          {layers.hazard && (
            <text textAnchor="middle" y="18" fill={risk[z.id] >= 3 ? '#f08a76' : '#b6aea1'} fontSize="12" fontWeight="700" stroke="#1c1b18" strokeWidth="3" paintOrder="stroke">
              {z.id} · {RISK_LABEL[risk[z.id]].toUpperCase()}
            </text>
          )}
        </g>
      ))}

      {layers.relief &&
        RELIEF_SITES.map((s) => {
          const Icon = RELIEF_ICON[s.kind];
          const usable = siteUsable(s, hazard);
          const selected = selectedSite === s.id;
          return (
            <g
              key={s.id}
              transform={`translate(${s.x} ${s.y})`}
              role={onSelectSite ? 'button' : undefined}
              tabIndex={onSelectSite ? 0 : undefined}
              aria-label={`${s.name}${usable ? '' : ' (unsafe for this hazard)'}`}
              onClick={() => onSelectSite?.(s)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectSite?.(s)}
              style={{ cursor: onSelectSite ? 'pointer' : 'default' }}
            >
              {selected && <circle r="26" fill="none" stroke="#ece6da" strokeWidth="2" />}
              <circle r="17" fill="#141312" stroke={usable ? RELIEF_COLOR[s.kind] : '#e06a55'} strokeWidth="3" strokeDasharray={usable ? undefined : '4 3'} />
              <Icon x={-10} y={-10} width={20} height={20} color={usable ? RELIEF_COLOR[s.kind] : '#e06a55'} strokeWidth={2.4} aria-hidden />
            </g>
          );
        })}
      {highlight && (
        <g transform={`translate(${highlight.x} ${highlight.y})`} aria-label="Your location">
          <circle r="22" fill="none" stroke="#ece6da" strokeWidth="2" opacity="0.6" />
          <circle r="9" fill="#e06a55" stroke="#fff" strokeWidth="3" />
          <text y="-30" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" stroke="#1c1b18" strokeWidth="4" paintOrder="stroke">
            You are here
          </text>
        </g>
      )}
    </svg>
  );
}

export function MapLegend({ showPeople = true }: { showPeople?: boolean }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-2">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm" style={{ background: RISK_FILL[4] }} /> Severe / high risk zone
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded-sm" style={{ background: RISK_FILL[2] }} /> Moderate risk
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-0.5 w-5 border-t-2 border-dashed border-ok" /> Evacuation route
      </span>
      {(Object.keys(RELIEF_ICON) as ReliefKind[]).map((k) => {
        const I = RELIEF_ICON[k];
        return (
          <span key={k} className="flex items-center gap-1.5">
            <I aria-hidden className="size-3.5" style={{ color: RELIEF_COLOR[k] }} /> {k[0].toUpperCase() + k.slice(1)}
          </span>
        );
      })}
      {showPeople && (
        <>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[2] }} /> Delivered
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[3] }} /> Marked safe
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[4] }} /> Needs help
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full" style={{ background: STATUS_COLOR[0] }} /> Not yet reached
          </span>
        </>
      )}
    </div>
  );
}
