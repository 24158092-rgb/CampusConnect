import { motion } from 'framer-motion';
import { ArrowRight, BellRing, CircleCheck, GitBranch, Languages, Layers, Play, Radio, RadioTower, Send, ShieldCheck, Split, Users, Volume2, Wifi, Workflow } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProvenanceTag, SeverityBadge, SyntheticLabel } from '../components/badges';
import { SystemStatusPanel } from '../components/controls';
import { PipelineFlow } from '../components/pipeline';
import { ActivityFeed, MetricCard } from '../components/tracking';
import { Button, Panel } from '../components/ui';
import { launchDemo } from '../data/demoScript';
import { HAZARD_ICON, HAZARD_LABEL, LANGUAGES } from '../data/languages';
import { CHANNEL_LABEL } from '../data/network';
import { useSelectedAlert, useStore } from '../store/useStore';
import { lowLiteracyLines, plainLanguageLines, textStats } from '../utils/content';

const DIFFERENTIATORS = [
  { icon: ShieldCheck, title: 'Meaning preservation', text: 'Hazard, severity, area, timing and action are checked in every version.' },
  { icon: GitBranch, title: 'Message lineage', text: 'Every format traces back to one immutable official source.' },
  { icon: Layers, title: 'Multi-modal alerts', text: 'Text, translated, visual/icon and voice versions.' },
  { icon: Wifi, title: 'Low-bandwidth resilience', text: 'Latency, packet loss, retries and queues — simulated.' },
  { icon: Radio, title: 'Community relay', text: 'Offline/local propagation through volunteer nodes.' },
  { icon: Split, title: 'Fallback channels', text: 'Internet → SMS → Relay → Offline Queue.' },
  { icon: CircleCheck, title: 'Acknowledgement', text: 'Receiving ≠ understanding. “I need help” is tracked.' },
  { icon: Users, title: 'Persona adaptation', text: 'Different presentation, identical emergency facts.' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const alert = useSelectedAlert();
  const alerts = useStore((s) => s.alerts);
  const deliveries = useStore((s) => s.deliveries);
  const nodes = useStore((s) => s.nodes);
  const transformations = useStore((s) => s.transformations);
  const demoMode = useStore((s) => s.demo.mode);
  const selectAlert = useStore((s) => s.selectAlert);

  const metrics = useMemo(() => {
    const delivered = deliveries.filter((d) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(d.status)).length;
    return {
      delivered,
      acks: deliveries.filter((d) => d.acknowledged).length,
      relaysOnline: nodes.filter((n) => n.status === 'online' && n.kind !== 'cluster').length,
      relaysTotal: nodes.filter((n) => n.kind !== 'cluster').length,
    };
  }, [deliveries, nodes]);

  const before = textStats(alert.originalMessage);
  const plain = plainLanguageLines(alert, 'en');
  const after = textStats(plain.join('\n'));
  const formats = transformations.filter((t) => t.alertId === alert.id && (t.type === 'visual' || t.type === 'sms')).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-panel via-panel to-info-2/10 p-6 sm:p-10">
        <div aria-hidden className="pointer-events-none absolute -top-32 -right-20 size-96 rounded-full bg-info/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-40 left-10 size-96 rounded-full bg-crit/10 blur-3xl" />
        <div className="relative max-w-3xl">
          <p className="flex items-center gap-2 font-mono text-xs font-bold tracking-[0.25em] text-info uppercase">
            <span aria-hidden className="pulse-ring size-2 rounded-full bg-crit text-crit" /> Emergency Operations Center · Communication Platform
          </p>
          <h1 className="mt-3 text-3xl leading-[1.05] font-black tracking-tight sm:text-5xl">
            From Official Alert to <span className="bg-gradient-to-r from-info to-ok bg-clip-text text-transparent">Last-Mile Action</span>
          </h1>
          <p className="mt-4 text-lg text-ink-2">
            Transform complex emergency warnings into clear, accessible, multilingual and low-bandwidth communication — without changing their meaning or urgency.
          </p>
          <p className="mt-1 text-sm text-ink-3">LASTMILE — Making Emergency Warnings Understandable, Accessible and Reachable.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" variant="primary" icon={Play} onClick={() => launchDemo('full')} disabled={Boolean(demoMode)}>
              Launch Emergency Demo
            </Button>
            <Button size="lg" icon={Workflow} onClick={() => document.getElementById('pipeline')?.scrollIntoView({ behavior: 'smooth' })}>
              Explore Pipeline
            </Button>
            <Button size="lg" variant="ghost" icon={BellRing} onClick={() => launchDemo('judge')} disabled={Boolean(demoMode)} className="sm:hidden">
              Judge Demo
            </Button>
          </div>
          <SyntheticLabel className="mt-5" />
        </div>
      </section>

      {/* Metrics */}
      <section aria-label="Key metrics (demo session)" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <MetricCard label="Active Alerts" value={alerts.length} icon={BellRing} tone="crit" hint="Synthetic scenarios" />
        <MetricCard label="Languages Available" value={LANGUAGES.length} icon={Languages} tone="ok" hint={LANGUAGES.map((l) => l.nativeName).join(' · ')} />
        <MetricCard label="Messages Delivered" value={metrics.delivered} icon={Send} tone="info" hint="Simulated this session" />
        <MetricCard label="Acknowledgements" value={metrics.acks} icon={CircleCheck} tone="ok" hint="Recipient responses" />
        <MetricCard label="Relay Nodes Online" value={metrics.relaysOnline} suffix={`/${metrics.relaysTotal}`} icon={RadioTower} tone="warn" hint="Demo relay network" />
      </section>

      {/* Pipeline */}
      <Panel id="pipeline" className="scroll-mt-24">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">Process Flow — one connected pipeline</h2>
            <p className="text-sm text-ink-3">Click any stage to open its module. Active stages glow; completed stages show a check.</p>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Choose alert">
            {alerts.slice(0, 4).map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => selectAlert(a.id)}
                aria-pressed={a.id === alert.id}
                className={`flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold ${a.id === alert.id ? 'border-info bg-info/15 text-info' : 'border-line text-ink-2 hover:text-ink'}`}
              >
                <span aria-hidden>{HAZARD_ICON[a.type]}</span>
                {HAZARD_LABEL[a.type].replace(' Warning', '')}
              </button>
            ))}
          </div>
        </div>
        <PipelineFlow alertId={alert.id} />
      </Panel>

      {/* Before vs After */}
      <Panel>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold">Before vs After</h2>
          <SeverityBadge severity={alert.severity} />
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border-2 border-info-2/60 bg-black/20 p-4">
            <ProvenanceTag kind="official" label="Before · official technical warning" />
            <p className="mt-3 text-sm leading-relaxed text-ink-2">{alert.originalMessage}</p>
          </div>
          <div className="space-y-3 rounded-xl border border-info/50 bg-info/5 p-4">
            <div className="flex flex-wrap gap-2">
              <ProvenanceTag kind="simplified" label="After · plain language" />
              <ProvenanceTag kind="translated" label="+ local language" />
              <ProvenanceTag kind="generated" label="+ icons & voice" />
            </div>
            <ul className="space-y-1 text-base">
              {plain.slice(0, 5).map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <div className="grid gap-2 sm:grid-cols-2">
              {lowLiteracyLines(alert, 'hi').slice(0, 4).map((l) => (
                <p key={l.text} lang="hi" className="flex items-center gap-2 rounded-lg bg-panel-2 p-2 text-sm font-bold">
                  <span aria-hidden className="text-2xl">
                    {l.icon}
                  </span>
                  {l.text}
                </p>
              ))}
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-3">
              <Volume2 aria-hidden className="size-4" /> Voice playback available in Visual Studio.
            </p>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            ['Reading complexity reduced', `${before.avgSentence} → ${after.avgSentence} words / sentence`, `${before.longWords} → ${after.longWords} long words (10+ letters)`],
            ['Languages supported', `${LANGUAGES.length}`, LANGUAGES.map((l) => l.name).join(', ')],
            ['Accessible formats generated', `${formats || '—'}`, formats ? 'Visual + SMS versions for this alert' : 'Run the pipeline to generate'],
            ['Delivery channels simulated', `${Object.keys(CHANNEL_LABEL).length}`, Object.values(CHANNEL_LABEL).join(' · ')],
          ].map(([k, v, hint]) => (
            <div key={k} className="rounded-lg border border-line bg-panel-2/60 p-3">
              <dt className="text-xs font-semibold text-ink-3 uppercase">{k}</dt>
              <dd className="mt-1 font-mono text-lg font-bold">{v}</dd>
              <dd className="text-[0.7rem] text-ink-3">{hint}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2 text-[0.7rem] text-ink-3">Descriptive counts from the demo text — not a scientific readability score.</p>
      </Panel>

      {/* Differentiators */}
      <section aria-label="Product differentiators" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DIFFERENTIATORS.map((d, i) => (
          <motion.div key={d.title} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="glass rounded-xl p-4">
            <d.icon aria-hidden className="size-6 text-info" />
            <p className="mt-2 font-bold">{d.title}</p>
            <p className="mt-1 text-sm text-ink-3">{d.text}</p>
          </motion.div>
        ))}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
        <Panel>
          <ActivityFeed limit={14} />
        </Panel>
        <Panel>
          <SystemStatusPanel />
          <Button className="mt-4 w-full" icon={ArrowRight} onClick={() => navigate('/analytics')}>
            Open analytics
          </Button>
        </Panel>
      </div>
    </div>
  );
}
