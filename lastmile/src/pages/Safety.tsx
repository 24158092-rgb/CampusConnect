import { Copy, Phone, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useEffect, useState } from 'react';
import { HazardIcon } from '../components/icons';
import { PrecautionsCard } from '../components/Precautions';
import { PageHeader, Panel, SectionTitle, cx } from '../components/ui';
import { HAZARD_LABEL } from '../data/languages';
import { EMERGENCY_CONTACTS, EMERGENCY_KIT } from '../data/safety';
import { useSelectedAlert } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { HazardType } from '../types';
import { copyText } from '../utils/export';

const HAZARDS: HazardType[] = ['flood', 'cyclone', 'heat', 'heavyRain', 'severeWeather'];
const KIT_KEY = 'lastmile-kit';

export default function Safety() {
  const alert = useSelectedAlert();
  const [hazard, setHazard] = useState<HazardType>(alert.type);
  const [kit, setKit] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KIT_KEY) ?? '[]') as string[];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(KIT_KEY, JSON.stringify(kit));
    } catch {
      /* optional */
    }
  }, [kit]);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Safety" title="Safety & emergency contacts" description="Recommended actions for every alert type, helpline numbers and a personal emergency kit checklist. Available offline." />

      <Panel>
        <SectionTitle icon={Phone}>Emergency contacts</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {EMERGENCY_CONTACTS.map((c) => (
            <div key={c.number} className={cx('rounded-xl border p-4', c.real ? 'border-line bg-panel-2' : 'border-dashed border-line')}>
              <p className="text-3xl font-bold tabular-nums">{c.number}</p>
              <p className="mt-1 font-bold">{c.name}</p>
              <p className="text-sm text-ink-3">{c.description}</p>
              <div className="mt-3 flex gap-2">
                {c.real ? (
                  <a href={`tel:${c.number}`} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-crit px-3 text-sm font-bold text-white">
                    <Phone aria-hidden className="size-4" /> Call
                  </a>
                ) : (
                  <span className="rounded-md border border-amber/50 px-2 py-1 text-xs font-bold text-amber">DEMO CONTACT</span>
                )}
                <button type="button" onClick={async () => toast((await copyText(c.number)) ? `${c.number} copied` : 'Copy failed', 'success')} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-line px-3 text-sm font-bold" aria-label={`Copy ${c.name} number`}>
                  <Copy aria-hidden className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-ink-3">National numbers shown are real Indian emergency helplines — use them only in a real emergency. Demo contacts are synthetic.</p>
      </Panel>

      <div>
        <div className="mb-3 flex flex-wrap gap-2" role="group" aria-label="Choose hazard">
          {HAZARDS.map((h) => (
            <button key={h} type="button" onClick={() => setHazard(h)} aria-pressed={hazard === h} className={cx('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold', hazard === h ? 'border-ink bg-panel-2' : 'border-line text-ink-3 hover:text-ink')}>
              <HazardIcon type={h} tile={false} className="size-4" />
              {HAZARD_LABEL[h]}
              {h === alert.type && <span className="rounded bg-crit px-1.5 text-[0.65rem] text-white">ACTIVE ALERT</span>}
            </button>
          ))}
        </div>
        <PrecautionsCard hazard={hazard} />
      </div>

      <Panel>
        <SectionTitle icon={ShoppingBag} right={<span className="text-sm text-ink-3">{kit.length}/{EMERGENCY_KIT.length} packed</span>}>
          Emergency kit checklist
        </SectionTitle>
        <ul className="grid gap-2 sm:grid-cols-2">
          {EMERGENCY_KIT.map((item) => {
            const on = kit.includes(item);
            return (
              <li key={item}>
                <label className={cx('flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3', on ? 'border-ok/60 bg-ok/10' : 'border-line')}>
                  <input type="checkbox" checked={on} onChange={() => setKit((k) => (on ? k.filter((x) => x !== item) : [...k, item]))} className="size-5 accent-[var(--ok)]" />
                  <span className="font-bold">{item}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <p className="mt-3 flex items-center gap-2 text-xs text-ink-3">
          <ShieldCheck aria-hidden className="size-4" /> Saved on this device.
        </p>
      </Panel>
    </div>
  );
}
