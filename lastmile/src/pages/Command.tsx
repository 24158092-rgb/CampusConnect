import { ArrowRight, BellRing, CircleCheck, Clock, ExternalLink, FileCheck2, HandHelping, Languages, Map as MapIcon, MapPin, Phone, Play, Send, Users } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ProvenanceTag, SeverityBadge, SyntheticLabel } from '../components/badges';
import { DisasterMap, MapLegend } from '../components/DisasterMap';
import { HazardIcon } from '../components/icons';
import { PrecautionsCard } from '../components/Precautions';
import { ActivityFeed } from '../components/tracking';
import { Button, Panel, ProgressBar, SectionTitle, cx } from '../components/ui';
import { launchDemo } from '../data/demoScript';
import { ZONES, ZONE_RISK } from '../data/geo';
import { HAZARD_LABEL, LANGUAGES, languageInfo } from '../data/languages';
import { EMERGENCY_CONTACTS } from '../data/safety';
import { sourceById } from '../data/network';
import { summarize, useBroadcast } from '../store/useBroadcast';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { LanguageCode } from '../types';
import { plainLanguageLines } from '../utils/content';

export default function Command() {
  const alert = useSelectedAlert();
  const navigate = useNavigate();
  const demoMode = useStore((s) => s.demo.mode);
  const { dataset, broadcast, start, setComposerOpen } = useBroadcast();
  const [lang, setLang] = useState<LanguageCode>('hi');
  const sum = summarize(broadcast);
  const risk = ZONE_RISK[alert.type];
  const affectedZones = ZONES.filter((z) => risk[z.id] >= 3);
  const atRisk = dataset.filter((p) => risk[p.zone] >= 3).length;

  const broadcastAlert = () => {
    start({ kind: 'alert', alert });
    toast(`Broadcasting ${alert.id} to ${dataset.length.toLocaleString()} residents (simulated).`, 'info');
    navigate('/broadcast/all');
  };

  return (
    <div className="space-y-5">
      {/* Active disaster */}
      <section className={cx('rounded-2xl border-2 p-5 sm:p-6', alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'border-crit/70 bg-crit/10' : 'border-warn/60 bg-warn/10')} aria-labelledby="active-disaster">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <HazardIcon type={alert.type} className="size-16 bg-crit text-white" />
            <div>
              <p className="text-sm font-bold text-ink-3">ACTIVE DISASTER · {alert.id}</p>
              <h1 id="active-disaster" className="mt-1 text-3xl sm:text-4xl">
                {HAZARD_LABEL[alert.type]}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                <SeverityBadge severity={alert.severity} large />
                <span className="flex items-center gap-1.5 font-bold">
                  <MapPin aria-hidden className="size-4 text-ink-3" /> {alert.affectedArea}
                </span>
                <span className="flex items-center gap-1.5 font-bold">
                  <Clock aria-hidden className="size-4 text-ink-3" /> {alert.issuedAt} – {alert.validUntil}
                </span>
                <span className="text-ink-3">{sourceById(alert.source).name}</span>
              </div>
              <p className="mt-2 text-sm text-ink-2">
                High-risk zones: <b className="text-ink">{affectedZones.map((z) => z.name).join(', ') || 'none'}</b> · {atRisk.toLocaleString()} residents at risk
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button size="lg" variant="danger" icon={BellRing} onClick={() => setComposerOpen(true)}>
              Send SOS to all {dataset.length.toLocaleString()}
            </Button>
            <Button size="lg" variant="primary" icon={Send} onClick={broadcastAlert}>
              Broadcast this alert
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Broadcast status">
        {[
          { label: 'Residents in dataset', value: dataset.length.toLocaleString(), icon: Users, tone: 'text-ink' },
          { label: 'Reached', value: broadcast ? `${sum.pct}%` : '—', icon: Send, tone: 'text-[#6aa5ee]' },
          { label: 'Marked safe', value: broadcast ? sum.safe.toLocaleString() : '—', icon: CircleCheck, tone: 'text-ok' },
          { label: 'Need help', value: broadcast ? sum.help.toLocaleString() : '—', icon: HandHelping, tone: 'text-crit' },
        ].map((s) => (
          <div key={s.label} className="glass rounded-xl p-4">
            <p className="flex items-center justify-between text-sm font-bold text-ink-3">
              {s.label} <s.icon aria-hidden className="size-4" />
            </p>
            <p className={cx('mt-2 text-3xl font-bold tabular-nums', s.tone)}>{s.value}</p>
          </div>
        ))}
      </section>
      {broadcast && (
        <Panel>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="font-bold">
              {broadcast.kind === 'sos' ? 'SOS broadcast' : `Alert broadcast ${broadcast.alertId}`} · {sum.delivered.toLocaleString()} of {sum.total.toLocaleString()} reached {broadcast.running && '· live'}
            </span>
            <Link to="/broadcast/all" className="flex items-center gap-1 font-bold text-ink-2 hover:text-ink">
              Open broadcast <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
          <div className="mt-2">
            <ProgressBar value={sum.pct} tone="ok" label="Broadcast reach" />
          </div>
        </Panel>
      )}

      {/* Official vs derived — separate sections */}
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border-2 border-info-2/60 bg-panel p-5" aria-labelledby="official-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="official-title" className="flex items-center gap-2 text-base">
              <FileCheck2 aria-hidden className="size-5 text-info-2" /> Official alert
            </h2>
            <ProvenanceTag kind="official" label="Official · unchanged" />
          </div>
          <p className="mt-3 leading-relaxed text-ink">{alert.originalMessage}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SyntheticLabel />
            <Link to="/alerts/official" className="flex items-center gap-1 text-sm font-bold text-ink-2 hover:text-ink">
              Full official alert <ArrowRight aria-hidden className="size-4" />
            </Link>
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-panel p-5" aria-labelledby="derived-title">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="derived-title" className="flex items-center gap-2 text-base">
              <Languages aria-hidden className="size-5 text-ink-3" /> Simplified & translated
            </h2>
            <ProvenanceTag kind={lang === 'en' ? 'simplified' : 'translated'} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Language">
            {LANGUAGES.map((l) => (
              <button key={l.code} type="button" onClick={() => setLang(l.code)} aria-pressed={lang === l.code} className={cx('min-h-9 rounded-lg border px-3 text-sm font-bold', lang === l.code ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2')}>
                {l.nativeName}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-1.5 text-lg" lang={lang}>
            {plainLanguageLines(alert, lang).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-ink-3">Derived from the official alert · {languageInfo(lang).name} · checked for the same facts. Not a certified translation.</p>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_26rem]">
        <Panel>
          <SectionTitle icon={MapIcon} right={<Link to="/map" className="flex items-center gap-1 text-sm font-bold text-ink-2 hover:text-ink">Open map <ArrowRight aria-hidden className="size-4" /></Link>}>
            Disaster & relief map
          </SectionTitle>
          <DisasterMap hazard={alert.type} />
          <div className="mt-3">
            <MapLegend />
          </div>
        </Panel>
        <div className="space-y-5">
          <PrecautionsCard hazard={alert.type} compact />
          <Panel>
            <SectionTitle icon={Phone} right={<Link to="/safety" className="text-sm font-bold text-ink-2 hover:text-ink">All contacts</Link>}>
              Emergency contacts
            </SectionTitle>
            <ul className="grid grid-cols-2 gap-2">
              {EMERGENCY_CONTACTS.filter((c) => c.real).slice(0, 4).map((c) => (
                <li key={c.number}>
                  <a href={`tel:${c.number}`} className="flex min-h-14 flex-col justify-center rounded-lg border border-line bg-panel-2 px-3 hover:border-ink/40">
                    <span className="text-xl font-bold">{c.number}</span>
                    <span className="text-xs text-ink-3">{c.name}</span>
                  </a>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_26rem]">
        <Panel>
          <ActivityFeed limit={10} />
        </Panel>
        <Panel>
          <SectionTitle icon={Play}>Presenting?</SectionTitle>
          <p className="text-sm text-ink-2">
            The Judge Demo walks through the whole flow automatically: official alert → simplified → translated → map → broadcast to all residents → SOS alarm → responses.
          </p>
          <div className="mt-3 grid gap-2">
            <Button variant="primary" icon={Play} disabled={Boolean(demoMode)} onClick={() => launchDemo('judge')}>
              Run Judge Demo
            </Button>
            <Button icon={ExternalLink} onClick={() => window.open(`${location.pathname}#/login?as=user`, '_blank')}>
              Open a resident phone (new tab)
            </Button>
          </div>
          <p className="mt-2 text-xs text-ink-3">Log in there as a user, then send an SOS from here — the resident tab rings an alarm.</p>
        </Panel>
      </div>
    </div>
  );
}
