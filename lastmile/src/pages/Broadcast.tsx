import { BellRing, CirclePause, CirclePlay, FastForward, Gauge, RotateCcw, Send, Smartphone, WifiOff } from 'lucide-react';
import { useMemo } from 'react';
import { StatusDot } from '../components/StatusDot';
import { DisasterMap, MapLegend } from '../components/DisasterMap';
import { Button, EmptyState, Panel, ProgressBar, SectionTitle, Toggle, cx } from '../components/ui';
import { languageInfo } from '../data/languages';
import { CH_LABEL, ST, ST_LABEL, messageFor, summarize, useBroadcast } from '../store/useBroadcast';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import { networkProfile } from '../utils/channel';
import { smsStats } from '../utils/content';
import { clock } from '../utils/time';

const PRESETS = [100, 60, 30, 10];

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-panel-2 p-3">
      <p className="text-xs font-bold text-ink-3">{label}</p>
      <p className={cx('mt-1 text-2xl font-bold tabular-nums', tone)}>{value}</p>
    </div>
  );
}

function ReachChart({ history, total }: { history: { tick: number; delivered: number; safe: number; help: number }[]; total: number }) {
  if (history.length < 2) return <p className="text-sm text-ink-3">The reach curve appears once the broadcast starts.</p>;
  const w = 600;
  const h = 140;
  const maxT = history[history.length - 1].tick || 1;
  const line = (key: 'delivered' | 'safe') => history.map((p, i) => `${i ? 'L' : 'M'}${((p.tick / maxT) * w).toFixed(1)},${(h - (p[key] / Math.max(total, 1)) * h).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 4}`} className="h-36 w-full" role="img" aria-label={`Reach over time: ${last.delivered} of ${total} delivered, ${last.safe} marked safe.`}>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={h * f} y2={h * f} stroke="var(--line)" />
        ))}
        <path d={`${line('delivered')} L${w},${h} L0,${h} Z`} fill="#3987e5" opacity="0.15" />
        <path d={line('delivered')} fill="none" stroke="#3987e5" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        <path d={line('safe')} fill="none" stroke="#86bf9f" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
      <figcaption className="mt-1 flex gap-4 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[#3987e5]" /> Delivered
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-ok" /> Marked safe
        </span>
        <span className="ml-auto">Tick {last.tick} (≈{((last.tick * 600) / 1000).toFixed(0)} s)</span>
      </figcaption>
    </figure>
  );
}

export default function Broadcast() {
  const alert = useSelectedAlert();
  const quality = useStore((s) => s.networkQuality);
  const outage = useStore((s) => s.outage);
  const setMain = useStore((s) => s.set);
  const { dataset, broadcast: b, past, offlineSim, browserOnline, start, setRunning, fastForward, reset, setOfflineSim, respond, setComposerOpen } = useBroadcast();
  const sum = summarize(b);
  const offline = offlineSim || !browserOnline;
  const profile = networkProfile(quality);
  const format = quality >= 50 ? { name: 'Rich app alert', bytes: '≈ 24 KB' } : quality >= 20 ? { name: 'Compressed text', bytes: '≈ 1.2 KB' } : { name: 'SMS-only (160 chars)', bytes: '≈ 140 B' };
  const perTick = offline || outage ? 30 : Math.round(10 + quality * 1.8) + (quality < 15 ? 35 : 70) + 30;
  const eta = Math.ceil(dataset.length / perTick) * 0.6;
  const sampleText = messageFor(b ?? { kind: 'alert', template: null, customText: '' }, alert, 'en');
  const sms = smsStats(sampleText);

  const samples = useMemo(() => {
    if (!b) return [];
    const picks: number[] = [];
    const langs = ['en', 'hi', 'or', 'bn'];
    for (const lang of langs) {
      const k = b.targets.findIndex((idx) => dataset[idx]?.language === lang);
      if (k >= 0) picks.push(k);
    }
    for (let k = 0; picks.length < 6 && k < b.targets.length; k += Math.max(1, Math.floor(b.targets.length / 7))) if (!picks.includes(k)) picks.push(k);
    return picks;
  }, [b, dataset]);

  const startAlert = () => {
    start({ kind: 'alert', alert });
    toast(`Broadcasting ${alert.id} to ${dataset.length.toLocaleString()} residents (simulated).`, 'info');
  };

  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl">Broadcast to all {dataset.length.toLocaleString()} residents</h2>
            <p className="mt-1 text-ink-3">Every resident in the temporary dataset receives the message in their own language, over the best channel available to them.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" icon={Send} onClick={startAlert}>
              Broadcast {alert.id}
            </Button>
            <Button variant="danger" icon={BellRing} onClick={() => setComposerOpen(true)}>
              Send SOS
            </Button>
          </div>
        </div>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[22rem_1fr]">
        <Panel>
          <SectionTitle icon={Gauge}>Network conditions</SectionTitle>
          <p className="text-sm font-bold">
            Network quality: <span className="tabular-nums">{quality}%</span> · {profile.label}
          </p>
          <input type="range" min={5} max={100} step={5} value={quality} onChange={(e) => setMain('networkQuality', Number(e.target.value))} aria-label="Network quality" className="mt-2 w-full accent-[var(--crit)]" />
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {PRESETS.map((q) => (
              <button key={q} type="button" onClick={() => setMain('networkQuality', q)} aria-pressed={quality === q} className={cx('min-h-10 rounded-lg border text-sm font-bold', quality === q ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2')}>
                {q}%
              </button>
            ))}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-3">Latency</dt><dd className="font-bold">{profile.latencyMs} ms</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Packet loss (simulated)</dt><dd className="font-bold">{Math.round(profile.lossRate * 100)}%</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Message format</dt><dd className="font-bold">{format.name}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Payload per person</dt><dd className="font-bold">{format.bytes}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">SMS length (English)</dt><dd className="font-bold">{sms.chars} chars · {sms.segments} part(s)</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Throughput</dt><dd className="font-bold">{perTick} msgs / 0.6 s</dd></div>
            <div className="flex justify-between"><dt className="text-ink-3">Estimated time to reach all</dt><dd className="font-bold">~{eta.toFixed(0)} s</dd></div>
          </dl>
          <div className="mt-4 space-y-3 border-t border-line pt-4">
            <Toggle checked={outage} onChange={(v) => setMain('outage', v)} label="Internet + cellular outage" description="App and SMS fail; messages fall back to the community relay." />
            <Toggle checked={offlineSim} onChange={setOfflineSim} label="Operator offline" description="New messages wait in the offline outbox and send when back online." />
          </div>
        </Panel>

        <div className="space-y-5">
          {!b ? (
            <EmptyState icon={Send} title="No broadcast yet" action={<Button variant="primary" icon={Send} onClick={startAlert}>Broadcast {alert.id} now</Button>}>
              Start a broadcast to watch {dataset.length.toLocaleString()} residents receive the alert live — with retries, fallbacks and responses.
            </EmptyState>
          ) : (
            <Panel>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-ink-3">
                    {b.id} · {b.kind === 'sos' ? 'SOS' : `Alert ${b.alertId}`} · started {clock(b.startedAt)}
                  </p>
                  <p className="mt-1 text-4xl font-bold tabular-nums">
                    {sum.delivered.toLocaleString()} <span className="text-lg text-ink-3">/ {sum.total.toLocaleString()} reached</span>
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {b.running ? (
                    <Button icon={CirclePause} onClick={() => setRunning(false)}>Pause</Button>
                  ) : (
                    !b.finishedAt && <Button icon={CirclePlay} onClick={() => setRunning(true)}>Resume</Button>
                  )}
                  <Button icon={FastForward} onClick={() => fastForward(10)} disabled={!b.running}>
                    Skip ahead
                  </Button>
                  <Button icon={RotateCcw} onClick={reset}>
                    Clear
                  </Button>
                </div>
              </div>
              <div className="mt-3">
                <ProgressBar value={sum.pct} tone="ok" label="Broadcast reach" />
              </div>
              {offline && sum.held > 0 && (
                <p className="mt-3 flex items-center gap-2 rounded-lg border border-warn/50 bg-warn/10 p-2 text-sm font-bold text-warn">
                  <WifiOff aria-hidden className="size-4" /> {sum.held.toLocaleString()} messages waiting in the offline outbox — they send automatically when you are back online.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Stat label="Delivered" value={sum.delivered.toLocaleString()} tone="text-[#6aa5ee]" />
                <Stat label="Marked safe" value={sum.safe.toLocaleString()} tone="text-ok" />
                <Stat label="Need help" value={sum.help.toLocaleString()} tone="text-crit" />
                <Stat label="Pending" value={sum.pending.toLocaleString()} />
              </div>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-bold">Delivered by channel</p>
                  {CH_LABEL.map((label, i) => (
                    <div key={label} className="mb-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-2">{label}</span>
                        <span className="font-bold tabular-nums">{b.deliveredVia[i].toLocaleString()}</span>
                      </div>
                      <ProgressBar value={sum.delivered ? (b.deliveredVia[i] / sum.delivered) * 100 : 0} label={`${label} share`} />
                    </div>
                  ))}
                  <p className="text-xs text-ink-3">
                    {b.failures.toLocaleString()} failed attempts retried · {sum.retrying} retrying now
                  </p>
                </div>
                <ReachChart history={b.history} total={sum.total} />
              </div>
            </Panel>
          )}

          {b && (
            <Panel>
              <SectionTitle icon={Smartphone}>What residents see — pop-up notification (sample)</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {samples.map((k) => {
                  const p = dataset[b.targets[k]];
                  const st = b.status[k];
                  const arrived = st >= ST.DELIVERED && st <= ST.HELP;
                  return (
                    <div key={k} className="rounded-2xl border border-line bg-[#0f0f0e] p-3">
                      <div className="flex items-center justify-between text-xs text-ink-3">
                        <span className="font-bold text-ink-2">{p.name}</span>
                        <span>
                          {languageInfo(p.language).name} · {CH_LABEL[b.channel[k]]}
                        </span>
                      </div>
                      {arrived ? (
                        <div className="mt-2 rounded-xl border-l-4 border-crit bg-panel-2 p-3" lang={p.language}>
                          <p className="text-xs font-bold text-crit uppercase">{b.kind === 'sos' ? 'SOS · Emergency' : 'Emergency alert'}</p>
                          <p className="mt-1 text-sm leading-snug">{messageFor(b, alert, p.language)}</p>
                        </div>
                      ) : (
                        <p className="mt-2 flex items-center gap-2 rounded-xl bg-panel-2 p-3 text-sm text-ink-3">
                          <StatusDot status={st} /> {ST_LABEL[st]}…
                        </p>
                      )}
                      <div className="mt-2 flex gap-2">
                        <button type="button" disabled={!arrived} onClick={() => respond(k, true)} className={cx('min-h-9 flex-1 rounded-lg text-xs font-bold disabled:opacity-40', st === ST.SAFE ? 'bg-ok text-slate-950' : 'border border-ok/60 text-ok')}>
                          I am safe
                        </button>
                        <button type="button" disabled={!arrived} onClick={() => respond(k, false)} className={cx('min-h-9 flex-1 rounded-lg text-xs font-bold disabled:opacity-40', st === ST.HELP ? 'bg-crit text-white' : 'border border-crit/60 text-crit')}>
                          Need help
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          <Panel>
            <SectionTitle>Live reach map</SectionTitle>
            <DisasterMap hazard={alert.type} layers={{ hazard: true, relief: false, routes: false, people: true }} />
            <div className="mt-3">
              <MapLegend />
            </div>
          </Panel>

          {past.length > 0 && (
            <Panel>
              <SectionTitle>Previous broadcasts</SectionTitle>
              <div className="relative overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs text-ink-3">
                    <tr>
                      <th scope="col" className="py-2">Broadcast</th>
                      <th scope="col">Recipients</th>
                      <th scope="col">Delivered</th>
                      <th scope="col">Safe</th>
                      <th scope="col">Need help</th>
                      <th scope="col">Started</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((p) => (
                      <tr key={p.id} className="border-t border-line">
                        <td className="py-2 font-bold">{p.title}</td>
                        <td>{p.recipients.toLocaleString()}</td>
                        <td>{p.delivered.toLocaleString()}</td>
                        <td>{p.safe.toLocaleString()}</td>
                        <td>{p.help.toLocaleString()}</td>
                        <td>{clock(p.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
