import { Ban, BellRing, ChartColumn, CircleCheck, Image, Languages, Play, RadioTower, Send } from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { STATUS } from '../components/badges';
import { MetricCard } from '../components/tracking';
import { Button, EmptyState, PageHeader, Panel } from '../components/ui';
import { launchDemo } from '../data/demoScript';
import { LANGUAGES } from '../data/languages';
import { CHANNEL_LABEL } from '../data/network';
import { useSelectedAlert, useStore } from '../store/useStore';
import type { Channel, DeliveryStatus } from '../types';
import { pct } from '../utils/time';

/** Categorical slots (dark-surface steps, fixed order) — validated reference palette. */
const SERIES = ['#3987e5', '#d95926', '#199e70'];
const STATUS_FILL: Record<DeliveryStatus, string> = {
  QUEUED: '#8595ad',
  IN_TRANSIT: '#3987e5',
  DELIVERED: '#199e70',
  ACKNOWLEDGED: '#34d399',
  NEEDS_HELP: '#e66767',
  FAILED: '#f43f5e',
  RETRYING: '#c98500',
};

const axis = { stroke: 'var(--ink-3)', fontSize: 12, tickLine: false, axisLine: { stroke: 'var(--line)' } };
const tooltipStyle = { background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, color: 'var(--ink)', fontSize: 12 };
const grid = <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />;

function ChartCard({ title, children, table }: { title: string; children: ReactNode; table: { head: string[]; rows: (string | number)[][] } }) {
  return (
    <Panel>
      <h2 className="mb-4 font-display text-2xl font-normal tracking-tight">{title}</h2>
      <div className="h-64">{children}</div>
      <details className="mt-2 text-sm">
        <summary className="min-h-9 cursor-pointer py-1 text-ink-3 hover:text-ink">View as table</summary>
        <table className="mt-2 w-full text-left text-xs">
          <thead>
            <tr className="border-b border-line text-ink-3">
              {table.head.map((h) => (
                <th key={h} scope="col" className="py-1">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r) => (
              <tr key={String(r[0])} className="border-b border-line/50">
                {r.map((c, i) => (
                  <td key={i} className="py-1 font-mono">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </Panel>
  );
}

export default function Analytics() {
  const alert = useSelectedAlert();
  const alerts = useStore((s) => s.alerts);
  const deliveries = useStore((s) => s.deliveries);
  const transformations = useStore((s) => s.transformations);
  const ackHistory = useStore((s) => s.ackHistory);
  const deliveryAlertId = useStore((s) => s.deliveryAlertId);
  const nodes = useStore((s) => s.nodes);
  const demoRunning = useStore((s) => Boolean(s.demo.mode));

  const d = useMemo(() => {
    const recs = deliveries.filter((r) => r.alertId === alert.id);
    const delivered = deliveries.filter((r) => ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(r.status)).length;
    const acked = deliveries.filter((r) => r.acknowledged).length;
    const failedAttempts = deliveries.reduce((a, r) => a + r.retryCount + (r.channelHistory.length - 1), 0);
    return {
      recs,
      delivered,
      acked,
      failedAttempts,
      translations: transformations.filter((t) => t.type === 'translation').length,
      visuals: transformations.filter((t) => t.type === 'visual').length,
      status: (Object.keys(STATUS) as DeliveryStatus[]).map((s) => ({ name: STATUS[s].label, key: s, value: recs.filter((r) => r.status === s).length })),
      channel: (Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => ({
        name: CHANNEL_LABEL[c],
        delivered: recs.filter((r) => r.channel === c && ['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(r.status)).length,
        rerouted: recs.filter((r) => r.channelHistory.slice(0, -1).includes(c)).length,
      })),
      language: LANGUAGES.map((l) => ({
        name: l.name,
        recipients: recs.filter((r) => r.language === l.code).length,
        versions: transformations.filter((t) => t.alertId === alert.id && t.language === l.code).length,
      })),
      relay: nodes
        .filter((n) => n.kind !== 'cluster')
        .map((n) => ({ name: n.name.replace(' (Demo)', '').replace(' (Volunteer Radio)', ''), forwarded: n.forwarded, queued: n.queue, status: n.status })),
    };
  }, [deliveries, transformations, nodes, alert.id]);

  const history = deliveryAlertId === alert.id ? ackHistory : [];

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Analytics" title="Analytics Dashboard" description="Every number here comes from the local simulation — synthetic data, updated live as events happen." />

      <section aria-label="Summary metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        <MetricCard label="Total Alerts" value={alerts.length} icon={BellRing} tone="crit" />
        <MetricCard label="Translations" value={d.translations} icon={Languages} tone="ok" />
        <MetricCard label="Visual Versions" value={d.visuals} icon={Image} tone="violet" />
        <MetricCard label="Delivered" value={d.delivered} icon={Send} tone="info" />
        <MetricCard label="Ack Rate" value={pct(d.acked, d.delivered)} suffix="%" icon={CircleCheck} tone="ok" />
        <MetricCard label="Failed Attempts" value={d.failedAttempts} icon={Ban} tone="crit" hint="retries + reroutes" />
        <MetricCard label="Active Relay Nodes" value={nodes.filter((n) => n.status === 'online' && n.kind !== 'cluster').length} icon={RadioTower} tone="warn" />
      </section>

      {d.recs.length === 0 && (
        <EmptyState icon={ChartColumn} title={`No simulated delivery for ${alert.id} yet`} action={<Button variant="primary" icon={Play} disabled={demoRunning} onClick={() => launchDemo('full')}>Run complete demo</Button>}>
          Charts fill in live once a delivery simulation runs for the selected alert.
        </EmptyState>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard title="1 · Delivery status distribution" table={{ head: ['Status', 'Recipients'], rows: d.status.map((s) => [s.name, s.value]) }}>
          <ResponsiveContainer>
            <BarChart data={d.status} layout="vertical" margin={{ left: 16, right: 24 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" allowDecimals={false} {...axis} />
              <YAxis type="category" dataKey="name" width={96} {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
              <Bar isAnimationActive={false} dataKey="value" name="Recipients" radius={[0, 4, 4, 0]} barSize={16} label={{ position: 'right', fill: 'var(--ink-2)', fontSize: 12 }}>
                {d.status.map((s) => (
                  <Cell key={s.key} fill={STATUS_FILL[s.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="2 · Acknowledgement over time (simulation ticks)" table={{ head: ['Tick', 'Delivered', 'Acknowledged', 'Needs help'], rows: history.map((h) => [h.tick, h.delivered, h.acknowledged, h.needsHelp]) }}>
          <ResponsiveContainer>
            <LineChart data={history} margin={{ right: 16 }}>
              {grid}
              <XAxis dataKey="tick" {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="delivered" name="Delivered" stroke={SERIES[0]} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="acknowledged" name="Acknowledged" stroke={SERIES[2]} strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="needsHelp" name="Needs help" stroke={SERIES[1]} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="3 · Delivery by communication mode" table={{ head: ['Mode', 'Delivered via', 'Rerouted away'], rows: d.channel.map((c) => [c.name, c.delivered, c.rerouted]) }}>
          <ResponsiveContainer>
            <BarChart data={d.channel} margin={{ right: 8 }}>
              {grid}
              <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 10, fill: 'var(--ink-3)' }} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="delivered" name="Delivered via" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={18} />
              <Bar isAnimationActive={false} dataKey="rerouted" name="Rerouted away (fallback)" fill={SERIES[1]} radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="4 · Language coverage" table={{ head: ['Language', 'Recipients', 'Versions generated'], rows: d.language.map((l) => [l.name, l.recipients, l.versions]) }}>
          <ResponsiveContainer>
            <BarChart data={d.language}>
              {grid}
              <XAxis dataKey="name" {...axis} />
              <YAxis allowDecimals={false} {...axis} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar isAnimationActive={false} dataKey="recipients" name="Recipients" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={18} />
              <Bar isAnimationActive={false} dataKey="versions" name="Versions generated" fill={SERIES[2]} radius={[4, 4, 0, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <div className="lg:col-span-2">
          <ChartCard title="5 · Relay network health" table={{ head: ['Node', 'Status', 'Forwarded', 'Queued'], rows: d.relay.map((r) => [r.name, r.status, r.forwarded, r.queued]) }}>
            <ResponsiveContainer>
              <BarChart data={d.relay}>
                {grid}
                <XAxis dataKey="name" {...axis} interval={0} tick={{ fontSize: 11, fill: 'var(--ink-3)' }} />
                <YAxis allowDecimals={false} {...axis} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} formatter={(v, n, p) => [`${v} (${(p?.payload as { status?: string })?.status ?? ''})`, n]} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar isAnimationActive={false} dataKey="forwarded" name="Messages forwarded" fill={SERIES[0]} radius={[4, 4, 0, 0]} barSize={22} />
                <Bar isAnimationActive={false} dataKey="queued" name="Queued (node offline)" fill={SERIES[1]} radius={[4, 4, 0, 0]} barSize={22} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
