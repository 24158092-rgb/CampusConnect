import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { Antenna, ArrowDown, ArrowRight, Building2, Radio, RadioTower, Smartphone, User, Users } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import { CHANNEL_LABEL, FALLBACK_CHAIN } from '../data/network';
import { relayPath, useStore } from '../store/useStore';
import type { Channel, DeliveryRecord, NodeStatus, RelayNode as RelayNodeT } from '../types';
import { isRelayChannel, networkProfile } from '../utils/channel';
import { cx } from './ui';

const TOPOLOGY: { label: string; icon: LucideIcon }[] = [
  { label: 'Source', icon: Building2 },
  { label: 'Regional Hub', icon: RadioTower },
  { label: 'Community Relay', icon: Antenna },
  { label: 'Local Device', icon: Smartphone },
  { label: 'Recipient', icon: User },
];

/** Animated packets moving through SOURCE → HUB → RELAY → DEVICE → RECIPIENT. Speed follows network quality. */
export function NetworkSimulator({ records }: { records: DeliveryRecord[] }) {
  const quality = useStore((s) => s.networkQuality);
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const profile = networkProfile(quality);
  const inTransit = records.filter((r) => r.status === 'IN_TRANSIT').length;
  const failing = records.filter((r) => r.status === 'FAILED' || r.status === 'RETRYING').length;
  const packets = Math.min(6, inTransit);
  const duration = 1.6 + profile.latencyMs / 700;

  return (
    <div className="relative" role="img" aria-label={`Simulated network topology. ${inTransit} messages in transit, ${failing} failing or retrying. Network ${quality}%.`}>
      <div className="relative flex items-center justify-between gap-1 py-6">
        <div aria-hidden className="absolute top-1/2 right-6 left-6 h-0.5 -translate-y-1/2 bg-line" />
        {!reduced &&
          Array.from({ length: packets }).map((_, i) => (
            <motion.span
              key={`p${i}`}
              aria-hidden
              className="absolute top-1/2 left-6 size-3 -translate-y-1/2 rounded-full bg-info"
              animate={{ left: ['3%', '95%'], opacity: [0, 1, 1, 0] }}
              transition={{ duration, repeat: Infinity, delay: (i * duration) / packets, ease: 'linear' }}
            />
          ))}
        {!reduced &&
          Array.from({ length: Math.min(3, failing) }).map((_, i) => (
            <motion.span
              key={`f${i}`}
              aria-hidden
              className="absolute top-1/2 size-3 rounded-full bg-crit"
              style={{ left: `${30 + i * 18}%` }}
              animate={{ y: [0, 28], opacity: [1, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.35 }}
            />
          ))}
        {TOPOLOGY.map((n) => (
          <div key={n.label} className="relative z-10 flex w-16 flex-col items-center gap-1 sm:w-24">
            <span className="grid size-11 place-items-center rounded-xl border border-info/60 bg-panel sm:size-14">
              <n.icon aria-hidden className="size-5 text-info sm:size-6" />
            </span>
            <span className="text-center text-[0.65rem] leading-tight font-bold sm:text-xs">{n.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const NODE_POS: Record<string, { x: number; y: number }> = {
  center: { x: 300, y: 40 },
  hub: { x: 300, y: 125 },
  'relay-a': { x: 150, y: 210 },
  'relay-b': { x: 450, y: 210 },
  local: { x: 150, y: 305 },
  cluster: { x: 300, y: 385 },
};

const EDGES: [string, string][] = [
  ['center', 'hub'],
  ['hub', 'relay-a'],
  ['hub', 'relay-b'],
  ['relay-a', 'local'],
  ['local', 'cluster'],
  ['relay-b', 'cluster'],
];

const STATUS_COLOR: Record<NodeStatus, string> = { online: 'var(--ok)', degraded: 'var(--warn)', offline: 'var(--crit)' };

/** Community / offline relay network. Offline nodes hold a queue that forwards when they return. */
export function RelayNetworkGraph({ records }: { records: DeliveryRecord[] }) {
  const nodes = useStore((s) => s.nodes);
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);

  const edgeActive = (a: string, b: string) =>
    records.some((r) => {
      if (r.status !== 'IN_TRANSIT' || !isRelayChannel(r.channel)) return false;
      const path = ['center', ...relayPath(r)];
      if (r.channel === 'communityRelay') path.push('cluster');
      const i = path.indexOf(a);
      return i >= 0 && path[i + 1] === b;
    });

  const clusterPending = records.filter((r) => isRelayChannel(r.channel) && !['DELIVERED', 'ACKNOWLEDGED', 'NEEDS_HELP'].includes(r.status)).length;

  return (
    <svg viewBox="0 0 600 450" className="w-full" role="img" aria-label={`Relay network: ${nodes.map((n) => `${n.name} ${n.status}${n.queue ? `, ${n.queue} queued` : ''}`).join('; ')}.`}>
      {EDGES.map(([a, b]) => {
        const p = NODE_POS[a];
        const q = NODE_POS[b];
        const down = byId[a]?.status === 'offline' || byId[b]?.status === 'offline';
        const active = edgeActive(a, b);
        return (
          <g key={`${a}-${b}`}>
            <line x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={down ? 'var(--crit)' : active ? 'var(--info)' : 'var(--line)'} strokeWidth={active ? 3 : 2} strokeDasharray={down ? '4 6' : undefined} className={active && !reduced ? 'flow-line' : undefined} opacity={down ? 0.6 : 1} />
            {active && !reduced && (
              <motion.circle r={6} fill="var(--info)" initial={{ cx: p.x, cy: p.y }} animate={{ cx: [p.x, q.x], cy: [p.y, q.y] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />
            )}
          </g>
        );
      })}
      {nodes.map((n) => {
        const pos = NODE_POS[n.id];
        if (!pos) return null;
        const status = n.kind === 'cluster' ? (clusterPending ? 'degraded' : 'online') : n.status;
        return (
          <g key={n.id} transform={`translate(${pos.x} ${pos.y})`}>
            <circle r={24} fill="var(--panel)" stroke={STATUS_COLOR[status]} strokeWidth={3} />
            {(() => {
              const I = n.kind === 'center' ? Building2 : n.kind === 'hub' ? RadioTower : n.kind === 'relay' ? Radio : n.kind === 'local' ? Antenna : Users;
              return <I x={-11} y={-11} width={22} height={22} color="var(--ink)" strokeWidth={2} aria-hidden />;
            })()}
            <text textAnchor="middle" y={42} fontSize="13" fontWeight="700" fill="var(--ink)">
              {n.name.replace(' (Demo)', '').replace(' (Volunteer Radio)', '')}
            </text>
            <text textAnchor="middle" y={58} fontSize="11" fontWeight="700" fill={STATUS_COLOR[status]}>
              {n.kind === 'cluster' ? (clusterPending ? `PENDING (${clusterPending})` : 'REACHED') : n.status.toUpperCase()}
            </text>
            {n.queue > 0 && (
              <g transform="translate(20 -22)">
                <rect x={-4} y={-11} width={44} height={20} rx={10} fill="var(--warn)" />
                <text x={18} y={4} textAnchor="middle" fontSize="11" fontWeight="800" fill="#111">
                  Q:{n.queue}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function RelayNodeControl({ node }: { node: RelayNodeT }) {
  const setNodeStatus = useStore((s) => s.setNodeStatus);
  if (node.kind === 'cluster' || node.kind === 'center') return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-panel-2/60 p-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-semibold">
          <Radio aria-hidden className="size-4 text-ink-3" />
          {node.name}
        </p>
        <p className="font-mono text-[0.7rem] text-ink-3">
          {node.bandwidth} kbps · {node.latency} ms · forwarded {node.forwarded} · queue {node.queue}
        </p>
      </div>
      <div role="radiogroup" aria-label={`${node.name} status`} className="flex gap-1">
        {(['online', 'degraded', 'offline'] as NodeStatus[]).map((st) => (
          <button
            key={st}
            type="button"
            role="radio"
            aria-checked={node.status === st}
            onClick={() => setNodeStatus(node.id, st)}
            className={cx(
              'min-h-9 rounded-md border px-2 text-xs font-bold uppercase',
              node.status === st ? (st === 'online' ? 'border-ok bg-ok text-slate-950' : st === 'degraded' ? 'border-warn bg-warn text-slate-950' : 'border-crit bg-crit text-white') : 'border-line text-ink-3 hover:text-ink',
            )}
          >
            {st}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Internet → SMS → Community Relay → Offline Queue, with live counts per channel. */
export function FallbackChain({ records, vertical }: { records: DeliveryRecord[]; vertical?: boolean }) {
  const counts = (c: Channel) => records.filter((r) => r.channel === c || (c === 'internet' && r.channel === 'lowBandwidth')).length;
  const switched = records.filter((r) => r.channelHistory.length > 1).length;
  return (
    <div>
      {switched > 0 && (
        <p className="mb-2 inline-flex items-center gap-2 rounded-md border border-warn bg-warn/15 px-2 py-1 text-xs font-extrabold text-warn uppercase">
          <span aria-hidden className="pulse-ring size-2 rounded-full bg-warn text-warn" /> Fallback Strategy Active · {switched} rerouted
        </p>
      )}
      <ol className={cx('flex gap-2', vertical ? 'flex-col' : 'flex-col sm:flex-row sm:items-center')}>
        {FALLBACK_CHAIN.map((c, i) => (
          <Fragment key={c}>
            <li className="flex flex-1 items-center justify-between gap-2 rounded-lg border border-line bg-panel-2/60 px-3 py-2">
              <span>
                <span className="block font-mono text-[0.65rem] font-bold text-ink-3">{i === 0 ? 'PRIMARY' : `FALLBACK ${i}`}</span>
                <span className="text-sm font-bold">{c === 'offlineRelay' ? 'Offline Queue / Relay' : CHANNEL_LABEL[c]}</span>
              </span>
              <span className="font-mono text-lg font-bold text-info">{counts(c)}</span>
            </li>
            {i < FALLBACK_CHAIN.length - 1 && (
              <li aria-hidden className="flex justify-center text-ink-3">
                {vertical ? <ArrowDown className="size-4" /> : <><ArrowDown className="size-4 sm:hidden" /><ArrowRight className="hidden size-4 sm:block" /></>}
              </li>
            )}
          </Fragment>
        ))}
      </ol>
    </div>
  );
}
