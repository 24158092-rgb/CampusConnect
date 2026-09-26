import { Layers, MapPin, Phone } from 'lucide-react';
import { useState } from 'react';
import { DisasterMap, MapLegend, RELIEF_COLOR, RELIEF_ICON, useShelterLoad, type MapLayers } from '../components/DisasterMap';
import { HazardIcon } from '../components/icons';
import { Button, PageHeader, Panel, ProgressBar, SectionTitle, Toggle, cx } from '../components/ui';
import { RELIEF_LABEL, RELIEF_SITES, RISK_LABEL, ZONES, ZONE_RISK, siteUsable, type ReliefSite } from '../data/geo';
import { HAZARD_LABEL } from '../data/languages';
import { useBroadcast } from '../store/useBroadcast';
import { useSelectedAlert } from '../store/useStore';
import type { HazardType } from '../types';

const HAZARDS: HazardType[] = ['flood', 'cyclone', 'heat', 'heavyRain'];

export default function MapPage() {
  const alert = useSelectedAlert();
  const [hazard, setHazard] = useState<HazardType>(alert.type);
  const [layers, setLayers] = useState<MapLayers>({ hazard: true, relief: true, routes: true, people: true });
  const [selected, setSelected] = useState<ReliefSite | null>(null);
  const dataset = useBroadcast((s) => s.dataset);
  const load = useShelterLoad(hazard);
  const risk = ZONE_RISK[hazard];
  const atRisk = dataset.filter((p) => risk[p.zone] >= 3).length;
  const shelterCap = RELIEF_SITES.filter((s) => s.kind === 'shelter' && siteUsable(s, hazard)).reduce((n, s) => n + s.capacity, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Live map"
        title="Disaster & relief map"
        description="Schematic map of the synthetic Demo Coastal District — drawn locally, so it works offline. Click a relief site for details."
      />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show hazard">
        {HAZARDS.map((h) => (
          <button key={h} type="button" onClick={() => setHazard(h)} aria-pressed={hazard === h} className={cx('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold', hazard === h ? 'border-ink bg-panel-2' : 'border-line text-ink-3 hover:text-ink')}>
            <HazardIcon type={h} tile={false} className="size-4" />
            {HAZARD_LABEL[h]}
            {h === alert.type && <span className="rounded bg-crit px-1.5 text-[0.65rem] text-white">ACTIVE</span>}
          </button>
        ))}
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Map summary">
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-bold text-ink-3">People in high-risk zones</p>
          <p className="mt-1 text-3xl font-bold text-crit tabular-nums">{atRisk.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-bold text-ink-3">Safe shelter capacity</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{shelterCap.toLocaleString()}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-bold text-ink-3">Relief sites open</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">
            {RELIEF_SITES.filter((s) => siteUsable(s, hazard)).length}/{RELIEF_SITES.length}
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs font-bold text-ink-3">Residents on map</p>
          <p className="mt-1 text-3xl font-bold tabular-nums">{dataset.length.toLocaleString()}</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
        <Panel>
          <DisasterMap hazard={hazard} layers={layers} selectedSite={selected?.id} onSelectSite={setSelected} />
          <div className="mt-3">
            <MapLegend />
          </div>
        </Panel>
        <div className="space-y-5">
          <Panel>
            <SectionTitle icon={Layers}>Layers</SectionTitle>
            <div className="space-y-2">
              <Toggle checked={layers.hazard} onChange={(v) => setLayers((l) => ({ ...l, hazard: v }))} label="Disaster zones" />
              <Toggle checked={layers.relief} onChange={(v) => setLayers((l) => ({ ...l, relief: v }))} label="Relief sites" />
              <Toggle checked={layers.routes} onChange={(v) => setLayers((l) => ({ ...l, routes: v }))} label="Evacuation routes" />
              <Toggle checked={layers.people} onChange={(v) => setLayers((l) => ({ ...l, people: v }))} label="Residents (message status)" />
            </div>
          </Panel>
          {selected ? (
            <Panel>
              <SectionTitle icon={MapPin}>{selected.name}</SectionTitle>
              <p className="text-sm text-ink-3">
                {RELIEF_LABEL[selected.kind]} · {ZONES.find((z) => z.id === selected.zone)?.name}
              </p>
              {siteUsable(selected, hazard) ? (
                <p className="mt-2 text-sm font-bold text-ok">Open — safe to use for this hazard</p>
              ) : (
                <p className="mt-2 text-sm font-bold text-crit">Unsafe — inside a high-risk zone for {HAZARD_LABEL[hazard]}</p>
              )}
              {selected.capacity > 0 && (
                <div className="mt-3">
                  <div className="flex justify-between text-sm">
                    <span>Occupancy</span>
                    <span className="font-bold tabular-nums">
                      {load[selected.id].toLocaleString()} / {selected.capacity.toLocaleString()}
                    </span>
                  </div>
                  <ProgressBar value={(load[selected.id] / selected.capacity) * 100} tone={load[selected.id] / selected.capacity > 0.85 ? 'crit' : 'ok'} label="Occupancy" />
                </div>
              )}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {selected.facilities.map((f) => (
                  <li key={f} className="rounded-md border border-line px-2 py-0.5 text-xs">
                    {f}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-2 text-sm text-ink-3">
                <Phone aria-hidden className="size-4" /> {selected.contact} (demo contact)
              </p>
              <Button size="sm" className="mt-3" onClick={() => setSelected(null)}>
                Close
              </Button>
            </Panel>
          ) : (
            <Panel>
              <SectionTitle>Zone risk — {HAZARD_LABEL[hazard]}</SectionTitle>
              <ul className="space-y-2">
                {[...ZONES].sort((a, b) => risk[b.id] - risk[a.id]).map((z) => (
                  <li key={z.id} className="flex items-center justify-between text-sm">
                    <span className="font-bold">{z.name}</span>
                    <span className={cx('rounded px-2 py-0.5 text-xs font-bold', risk[z.id] >= 3 ? 'bg-crit text-white' : risk[z.id] === 2 ? 'bg-warn/30 text-warn' : 'bg-panel-2 text-ink-3')}>{RISK_LABEL[risk[z.id]]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>

      <Panel>
        <SectionTitle>Relief sites</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {RELIEF_SITES.map((s) => {
            const Icon = RELIEF_ICON[s.kind];
            const usable = siteUsable(s, hazard);
            return (
              <button key={s.id} type="button" onClick={() => setSelected(s)} className={cx('rounded-xl border p-3 text-left transition hover:bg-panel-2', selected?.id === s.id ? 'border-ink' : 'border-line')}>
                <span className="flex items-center gap-2">
                  <Icon aria-hidden className="size-5" style={{ color: usable ? RELIEF_COLOR[s.kind] : '#e06a55' }} />
                  <span className="font-bold">{s.name}</span>
                </span>
                <span className="mt-1 block text-xs text-ink-3">
                  {RELIEF_LABEL[s.kind]} · {s.zone} · {usable ? 'Open' : 'Unsafe for this hazard'}
                </span>
                {s.capacity > 0 && s.kind !== 'food' && s.kind !== 'water' && (
                  <span className="mt-2 block">
                    <ProgressBar value={(load[s.id] / s.capacity) * 100} tone={load[s.id] / s.capacity > 0.85 ? 'crit' : 'ok'} label={`${s.name} occupancy`} />
                    <span className="mt-1 block text-xs text-ink-3 tabular-nums">
                      {load[s.id].toLocaleString()} / {s.capacity.toLocaleString()} occupied
                    </span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
