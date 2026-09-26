import { ArrowRight, Compass, Copy, FastForward, Gauge, MessageSquare, Pause, Play, Radio, RotateCcw, Send, Split } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StatusBadge } from '../components/badges';
import { FallbackChain, NetworkSimulator, RelayNetworkGraph, RelayNodeControl } from '../components/network';
import { RecipientPhonePreview } from '../components/visual';
import { Button, PageHeader, Panel, SectionTitle, Toggle, cx } from '../components/ui';
import { languageInfo, LANGUAGES } from '../data/languages';
import { CHANNEL_LABEL, INITIAL_NODES, PAYLOAD_BYTES, RECIPIENTS, personaById } from '../data/network';
import { findTransformation, useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { Channel, DeliveryStatus, LanguageCode } from '../types';
import { isRelayChannel, networkProfile, recommendChannel } from '../utils/channel';
import { smsStats, smsText } from '../utils/content';
import { copyText, DEMO_DISCLAIMER } from '../utils/export';

const PRESETS = [
  { q: 100, label: '100% — Normal' },
  { q: 60, label: '60% — Slow' },
  { q: 30, label: '30% — Very Slow' },
  { q: 10, label: '10% — Critical' },
];

const MODES: ('auto' | Channel)[] = ['auto', 'internet', 'lowBandwidth', 'sms', 'offlineRelay', 'communityRelay'];

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2/60 p-2.5">
      <dt className="text-[0.68rem] font-bold tracking-wider text-ink-3 uppercase">{label}</dt>
      <dd className={cx('mt-0.5 font-mono text-lg font-bold', tone)}>{value}</dd>
    </div>
  );
}

const transferTime = (bytes: number, kbps: number) => {
  const s = (bytes * 8) / (kbps * 1000);
  return s < 1 ? `${Math.round(s * 1000)} ms` : s < 120 ? `${s.toFixed(1)} s` : `${Math.round(s / 60)} min`;
};

export default function Delivery() {
  const alert = useSelectedAlert();
  const s = useStore();
  const navigate = useNavigate();
  const [smsLang, setSmsLang] = useState<LanguageCode>('en');
  const records = useMemo(() => s.deliveries.filter((d) => d.alertId === alert.id), [s.deliveries, alert.id]);
  const profile = networkProfile(s.networkQuality);
  const hasRun = records.length > 0;

  const count = (...st: DeliveryStatus[]) => records.filter((r) => st.includes(r.status)).length;
  const retries = records.reduce((a, r) => a + r.retryCount + (r.channelHistory.length - 1), 0);
  const relayRecs = records.filter((r) => isRelayChannel(r.channel));
  const deliveredRelay = relayRecs.filter((r) => r.hops > 0);
  const avgTime = deliveredRelay.length ? deliveredRelay.reduce((a, r) => a + r.simSeconds, 0) / deliveredRelay.length : 0;
  const smsRecords = records.filter((r) => r.channel === 'sms' && r.language === smsLang);
  const smsBody = findTransformation(s.transformations, alert.id, 'sms', smsLang)?.content ?? smsText(alert, smsLang);
  const stats = smsStats(smsBody);
  const statusLabel = s.outage ? 'OUTAGE (SIMULATED)' : profile.status;

  const start = () => {
    s.startDelivery(alert.id);
    toast('Simulated delivery started — no real messages are sent.', 'info');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 6 · Delivery Simulator"
        title="Delivery Simulator"
        description="Simulated communication only. Choose a mode and network condition, then watch messages move through the network — including retries, queues and fallbacks."
        actions={
          <>
            {!s.simRunning ? (
              <Button variant="primary" icon={hasRun ? RotateCcw : Play} onClick={start}>
                {hasRun ? 'Restart delivery' : 'Start simulated delivery'}
              </Button>
            ) : (
              <Button icon={Pause} onClick={() => s.setSimRunning(false)}>
                Pause
              </Button>
            )}
            {hasRun && !s.simRunning && records.some((r) => !['ACKNOWLEDGED', 'NEEDS_HELP'].includes(r.status)) && (
              <Button icon={Play} onClick={() => s.setSimRunning(true)}>
                Resume
              </Button>
            )}
            <Button icon={FastForward} disabled={!s.simRunning} onClick={() => s.fastForward(5)}>
              +5 ticks
            </Button>
            <Button icon={ArrowRight} onClick={() => navigate('/receipts')}>
              Receipt Tracker
            </Button>
          </>
        }
      />
      <p role="note" className="rounded-lg border border-warn/60 bg-warn/10 px-3 py-2 text-sm font-bold text-warn">
        SIMULATED DELIVERY — no SMS, internet push or radio message is actually sent. All recipients are synthetic.
      </p>

      <div className="grid gap-4 xl:grid-cols-[22rem_1fr]">
        <Panel>
          <SectionTitle icon={Send}>Communication mode</SectionTitle>
          <div role="radiogroup" aria-label="Communication mode" className="grid gap-1.5">
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={s.channelMode === m}
                onClick={() => s.set('channelMode', m)}
                className={cx('flex min-h-11 items-center justify-between rounded-lg border px-3 text-left text-sm font-semibold', s.channelMode === m ? 'border-info bg-info/10 text-info' : 'border-line text-ink-2 hover:text-ink')}
              >
                {m === 'auto' ? 'Auto — demo recommendation per recipient' : CHANNEL_LABEL[m]}
                {s.channelMode === m && <span aria-hidden>●</span>}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">Applies when delivery (re)starts.</p>

          <div className="mt-5">
            <SectionTitle icon={Gauge}>
              Network Quality: <span className="font-mono text-info">{s.networkQuality}%</span>
            </SectionTitle>
            <input
              type="range"
              min={5}
              max={100}
              step={5}
              value={s.networkQuality}
              onChange={(e) => s.set('networkQuality', Number(e.target.value))}
              aria-label="Network quality percent"
              aria-valuetext={`${s.networkQuality}% — ${profile.label}`}
              className="w-full accent-[var(--info)]"
            />
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.q}
                  type="button"
                  onClick={() => s.set('networkQuality', p.q)}
                  aria-pressed={s.networkQuality === p.q}
                  className={cx('min-h-10 rounded-lg border px-2 text-xs font-bold', s.networkQuality === p.q ? 'border-info bg-info text-slate-950' : 'border-line text-ink-2')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <Toggle checked={s.outage} onChange={(v) => s.set('outage', v)} label="Simulate internet + cellular outage" description="Direct channels fail → fallback strategy reroutes via relay." />
            <Toggle checked={s.autoAck} onChange={(v) => s.set('autoAck', v)} label="Synthetic recipients auto-acknowledge" description="Off: acknowledge manually in the Receipt Tracker." />
            <Toggle checked={s.autoRecover} onChange={(v) => s.set('autoRecover', v)} label="Auto-recover offline relays" description="Offline nodes return online after ~10 s of simulation." />
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">Simulated network topology</h2>
              <span className={cx('rounded-md px-2 py-1 font-mono text-xs font-extrabold', s.outage || s.networkQuality < 20 ? 'bg-crit text-white' : s.networkQuality < 50 ? 'bg-warn text-slate-950' : 'bg-ok text-slate-950')}>
                STATUS: {statusLabel}
              </span>
            </div>
            <NetworkSimulator records={records} />
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Network" value={`${s.networkQuality}%`} />
              <Stat label="Latency" value={`${profile.latencyMs} ms`} tone={profile.latencyMs > 1000 ? 'text-warn' : undefined} />
              <Stat label="Packet loss" value={`${Math.round(profile.lossRate * 100)}% (sim)`} tone={profile.lossRate > 0.2 ? 'text-crit' : undefined} />
              <Stat label="Throughput" value={`${profile.kbps} kbps`} />
              <Stat label="Queued" value={count('QUEUED')} />
              <Stat label="In transit" value={count('IN_TRANSIT')} tone="text-info" />
              <Stat label="Retries / reroutes" value={retries} tone={retries ? 'text-warn' : undefined} />
              <Stat label="Delivered" value={`${count('DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP')}/${records.length || RECIPIENTS.length}`} tone="text-ok" />
            </dl>
            <div className="relative mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-xs">
                <caption className="mb-1 text-left font-semibold text-ink-2">Estimated transfer time of each payload at the current network quality</caption>
                <thead className="text-ink-3">
                  <tr>
                    <th scope="col" className="py-1">Channel</th>
                    <th scope="col">Payload</th>
                    <th scope="col">Transfer time</th>
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(PAYLOAD_BYTES) as Channel[]).map((c) => (
                    <tr key={c} className="border-t border-line/60">
                      <td className="py-1.5 font-semibold">{CHANNEL_LABEL[c]}</td>
                      <td className="font-mono">{PAYLOAD_BYTES[c] >= 1000 ? `${(PAYLOAD_BYTES[c] / 1000).toFixed(1)} KB` : `${PAYLOAD_BYTES[c]} B`}</td>
                      <td className="font-mono">{c === 'sms' ? 'cell signalling (~2–10 s)' : isRelayChannel(c) ? 'relay-hop dependent' : transferTime(PAYLOAD_BYTES[c], profile.kbps)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel>
            <SectionTitle icon={Split}>Fallback Communication Strategy</SectionTitle>
            <FallbackChain records={records} />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel id="relay">
          <SectionTitle icon={Radio}>Offline / Community Relay Network</SectionTitle>
          <RelayNetworkGraph records={records} />
          <dl className="mt-2 grid grid-cols-3 gap-2">
            <Stat label="Relay messages" value={relayRecs.length} />
            <Stat label="Avg hops" value={deliveredRelay.length ? (deliveredRelay.reduce((a, r) => a + r.hops, 0) / deliveredRelay.length).toFixed(1) : '—'} />
            <Stat label="Queue length" value={s.nodes.reduce((a, n) => a + n.queue, 0)} tone="text-warn" />
            <Stat label="Avg delivery time" value={avgTime ? `${avgTime.toFixed(0)} s` : '—'} />
            <Stat label="Failed nodes" value={s.nodes.filter((n) => n.status === 'offline').length} tone="text-crit" />
            <Stat label="Healthy nodes" value={s.nodes.filter((n) => n.status === 'online').length} tone="text-ok" />
          </dl>
          <div className="mt-3 space-y-2">
            {s.nodes.map((n) => (
              <RelayNodeControl key={n.id} node={n} />
            ))}
          </div>
          <Button size="sm" variant="ghost" className="mt-2" icon={RotateCcw} onClick={() => s.set('nodes', INITIAL_NODES)}>
            Reset relay network (Relay B offline)
          </Button>
        </Panel>

        <div className="space-y-4">
          <Panel>
            <SectionTitle icon={MessageSquare}>SMS Simulation</SectionTitle>
            <div className="grid gap-4 md:grid-cols-[1fr_auto] xl:grid-cols-1 2xl:grid-cols-[1fr_auto]">
              <div className="order-2 space-y-3 md:order-1">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Language
                  <select value={smsLang} onChange={(e) => setSmsLang(e.target.value as LanguageCode)} className="min-h-10 rounded-lg border border-line bg-panel-2 px-2">
                    {LANGUAGES.map((l) => (
                      <option key={l.code} value={l.code}>
                        {l.name}
                      </option>
                    ))}
                  </select>
                </label>
                <dl className="grid grid-cols-2 gap-2">
                  <Stat label="Characters" value={stats.chars} />
                  <Stat label="Message size" value={`${stats.bytes} B`} />
                  <Stat label="Encoding" value={stats.encoding} />
                  <Stat label="SMS segments" value={stats.segments} tone={stats.segments > 2 ? 'text-warn' : undefined} />
                </dl>
                <div>
                  <p className="mb-1 text-xs font-bold text-ink-3 uppercase">Delivery status ({languageInfo(smsLang).name} SMS)</p>
                  {smsRecords.length ? (
                    <ul className="flex flex-wrap gap-1.5">
                      {smsRecords.map((r) => (
                        <li key={r.id} className="flex items-center gap-1 text-xs">
                          {r.recipient.name}: <StatusBadge status={r.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-ink-3">No {languageInfo(smsLang).name} recipients on SMS in the current run. Statuses: Queued → Sending → Delivered → Acknowledged.</p>
                  )}
                </div>
                <Button size="sm" icon={Copy} onClick={async () => toast((await copyText(`${smsBody}\n[SIMULATED SMS — ${DEMO_DISCLAIMER}]`)) ? 'SMS text copied.' : 'Copy failed.', 'success')}>
                  Copy SMS text
                </Button>
              </div>
              <div className="order-1 md:order-2">
                <RecipientPhonePreview alert={alert} lang={smsLang} />
              </div>
            </div>
          </Panel>

          <Panel>
            <SectionTitle icon={Compass}>Recommend Communication Channel</SectionTitle>
            <p className="mb-2 inline-block rounded-md border border-violet/60 bg-violet/10 px-2 py-0.5 font-mono text-[0.68rem] font-bold text-violet">DEMO CHANNEL RECOMMENDATION — not a real-world routing algorithm</p>
            <ul className="scrollbar-thin max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {RECIPIENTS.map((r) => {
                const rec = recommendChannel(r, s.networkQuality, s.outage);
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel-2/50 px-3 py-2 text-sm">
                    <span>
                      <b>{r.name}</b> <span className="text-ink-3">· {personaById(r.persona).label} · {languageInfo(r.language).name}</span>
                      <span className="block text-xs text-ink-3">
                        {r.hasSmartphone ? 'smartphone' : 'no smartphone'} · {r.hasInternet ? 'internet' : 'no internet'}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="block font-bold text-info">{CHANNEL_LABEL[rec.channel]}</span>
                      <span className="block text-xs text-ink-3">{rec.reason}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
