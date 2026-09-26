import { CircleCheck, Download, HandHelping, Search, Send, Truck, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { StatusDot } from '../components/StatusDot';
import { MetricCard } from '../components/tracking';
import { Button, EmptyState, Panel, ProgressBar, SectionTitle } from '../components/ui';
import { ZONES } from '../data/geo';
import { languageInfo } from '../data/languages';
import { CH_LABEL, ST, ST_LABEL, summarize, useBroadcast } from '../store/useBroadcast';
import { useStore } from '../store/useStore';
import { toast } from '../store/useToasts';

const PAGE = 25;

export default function ResidentResponses() {
  const { dataset, broadcast: b } = useBroadcast();
  const log = useStore((s) => s.log);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<number | 'all'>('all');
  const [page, setPage] = useState(0);
  const [dispatched, setDispatched] = useState<Set<number>>(new Set());
  const sum = summarize(b);

  const rows = useMemo(() => {
    if (!b) return [];
    return b.targets.map((idx, k) => ({ p: dataset[idx], st: b.status[k], ch: b.channel[k], k })).filter((r) => r.p);
  }, [b, dataset]);

  const helpList = rows.filter((r) => r.st === ST.HELP);
  const filtered = rows.filter((r) => (filter === 'all' || r.st === filter) && (!query || r.p.name.toLowerCase().includes(query.toLowerCase()) || String(r.p.id) === query));
  const pageRows = filtered.slice(page * PAGE, page * PAGE + PAGE);

  const zoneStats = ZONES.map((z) => {
    const zr = rows.filter((r) => r.p.zone === z.id);
    const reached = zr.filter((r) => r.st >= ST.DELIVERED && r.st <= ST.HELP).length;
    return { z, total: zr.length, reached, safe: zr.filter((r) => r.st === ST.SAFE).length, help: zr.filter((r) => r.st === ST.HELP).length };
  });

  const exportCsv = () => {
    const lines = ['# SYNTHETIC DEMO — simulated broadcast responses', 'id,name,zone,language,channel,status', ...rows.map((r) => [r.p.id, r.p.name, r.p.zone, r.p.language, CH_LABEL[r.ch], ST_LABEL[r.st]].join(','))];
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${b?.id ?? 'broadcast'}-responses.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!b) {
    return (
      <EmptyState icon={Users} title="No broadcast responses yet" action={<Link to="/broadcast/all" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-4 font-bold text-bg"><Send aria-hidden className="size-4" /> Go to Broadcast</Link>}>
        Send an alert or SOS to all residents to see who received it, who is safe and who needs help.
      </EmptyState>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Response summary">
        <MetricCard label="Reached" value={sum.delivered} suffix={` / ${sum.total}`} icon={Send} tone="info" />
        <MetricCard label="Marked safe" value={sum.safe} icon={CircleCheck} tone="ok" />
        <MetricCard label="Need help" value={sum.help} icon={HandHelping} tone="crit" />
        <MetricCard label="Not yet reached" value={sum.pending} icon={Users} tone="warn" />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1fr_24rem]">
        <Panel>
          <SectionTitle icon={HandHelping}>People who need help ({helpList.length})</SectionTitle>
          {helpList.length === 0 ? (
            <p className="text-sm text-ink-3">No help requests yet.</p>
          ) : (
            <ul className="scrollbar-thin max-h-96 space-y-2 overflow-y-auto pr-1">
              {helpList.map((r) => (
                <li key={r.p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-crit/40 bg-crit/5 p-3">
                  <div>
                    <p className="font-bold">
                      {r.p.name} <span className="text-sm font-normal text-ink-3">· age {r.p.age}</span>
                    </p>
                    <p className="text-sm text-ink-3">
                      {ZONES.find((z) => z.id === r.p.zone)?.name} · {languageInfo(r.p.language).name} · {r.p.phone}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={dispatched.has(r.p.id) ? 'secondary' : 'danger'}
                    icon={Truck}
                    disabled={dispatched.has(r.p.id)}
                    onClick={() => {
                      setDispatched((d) => new Set(d).add(r.p.id));
                      log(`Rescue team assigned to ${r.p.name} (${r.p.zone}) — simulated.`, 'warning');
                      toast(`Rescue team assigned to ${r.p.name} (simulated).`, 'success');
                    }}
                  >
                    {dispatched.has(r.p.id) ? 'Team assigned' : 'Assign rescue team'}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel>
          <SectionTitle>Reach by zone</SectionTitle>
          <ul className="space-y-3">
            {zoneStats.map((s) => (
              <li key={s.z.id}>
                <div className="flex justify-between text-sm">
                  <span className="font-bold">{s.z.name}</span>
                  <span className="tabular-nums text-ink-2">
                    {s.reached}/{s.total} · {s.help} need help
                  </span>
                </div>
                <ProgressBar value={s.total ? (s.reached / s.total) * 100 : 0} tone="ok" label={`${s.z.name} reach`} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base">All residents ({filtered.length.toLocaleString()})</h2>
          <label className="relative">
            <span className="sr-only">Search residents</span>
            <Search aria-hidden className="absolute top-3 left-3 size-4 text-ink-3" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Search name or ID" className="min-h-10 rounded-lg border border-line bg-panel-2 pr-3 pl-9 text-sm" />
          </label>
          <label className="sr-only" htmlFor="resp-filter">
            Filter by status
          </label>
          <select id="resp-filter" value={filter} onChange={(e) => { setFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setPage(0); }} className="min-h-10 rounded-lg border border-line bg-panel-2 px-2 text-sm">
            <option value="all">All statuses</option>
            {ST_LABEL.map((l, i) => (
              <option key={l} value={i}>
                {l}
              </option>
            ))}
          </select>
          <Button size="sm" icon={Download} onClick={exportCsv}>
            CSV
          </Button>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr className="border-b border-line">
                <th scope="col" className="py-2">ID</th>
                <th scope="col">Name</th>
                <th scope="col">Zone</th>
                <th scope="col">Language</th>
                <th scope="col">Channel</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.p.id} className="border-b border-line/60">
                  <td className="py-2 tabular-nums text-ink-3">{r.p.id}</td>
                  <td className="font-bold">{r.p.name}</td>
                  <td>{r.p.zone}</td>
                  <td>{languageInfo(r.p.language).name}</td>
                  <td>{CH_LABEL[r.ch]}</td>
                  <td>
                    <span className="flex items-center gap-2">
                      <StatusDot status={r.st} />
                      {ST_LABEL[r.st]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="text-ink-3">
            Page {page + 1} of {Math.max(1, Math.ceil(filtered.length / PAGE))}
          </span>
          <div className="flex gap-2">
            <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button size="sm" disabled={(page + 1) * PAGE >= filtered.length} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
