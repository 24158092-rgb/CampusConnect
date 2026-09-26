import { Database, Download, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, PageHeader, Panel, ProgressBar, SectionTitle, cx } from '../components/ui';
import { ZONES } from '../data/geo';
import { LANGUAGES, languageInfo } from '../data/languages';
import { personaById } from '../data/network';
import { useBroadcast } from '../store/useBroadcast';
import { toast } from '../store/useToasts';
import { datasetCsv } from '../utils/dataset';

const SIZES = [1000, 1200, 2500, 5000];
const PAGE = 20;

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Breakdown({ title, items }: { title: string; items: { label: string; value: number }[] }) {
  const total = items.reduce((n, i) => n + i.value, 0) || 1;
  return (
    <Panel>
      <SectionTitle>{title}</SectionTitle>
      <ul className="space-y-2.5">
        {items.map((i) => (
          <li key={i.label}>
            <div className="flex justify-between text-sm">
              <span>{i.label}</span>
              <span className="font-bold tabular-nums">
                {i.value.toLocaleString()} <span className="font-normal text-ink-3">({Math.round((i.value / total) * 100)}%)</span>
              </span>
            </div>
            <ProgressBar value={(i.value / total) * 100} label={`${i.label} share`} />
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function Dataset() {
  const { dataset, datasetSeed, generate, broadcast } = useBroadcast();
  const [size, setSize] = useState(dataset.length);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const count = <K extends keyof (typeof dataset)[number]>(key: K, value: (typeof dataset)[number][K]) => dataset.filter((p) => p[key] === value).length;
  const filtered = useMemo(() => dataset.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()) || p.zone.toLowerCase() === query.toLowerCase() || String(p.id) === query), [dataset, query]);

  const regenerate = () => {
    const n = Math.max(100, Math.min(10000, size || 1000));
    generate(n);
    setPage(0);
    toast(`Generated ${n.toLocaleString()} synthetic residents.`, 'success');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Dataset"
        title="Temporary demo dataset"
        description="A synthetic population used to show every feature working at scale — broadcasts, the map, responses and analytics. Stored only in this browser."
        actions={
          <>
            <Button icon={Download} onClick={() => download(`lastmile-dataset-${dataset.length}.csv`, datasetCsv(dataset), 'text/csv')}>
              CSV
            </Button>
            <Button icon={Download} onClick={() => download(`lastmile-dataset-${dataset.length}.json`, JSON.stringify({ note: 'SYNTHETIC DEMO DATASET — not real people', seed: datasetSeed, people: dataset }, null, 1), 'application/json')}>
              JSON
            </Button>
          </>
        }
      />

      <Panel>
        <SectionTitle icon={Database}>Generate residents</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Preset sizes">
            {SIZES.map((n) => (
              <button key={n} type="button" onClick={() => setSize(n)} aria-pressed={size === n} className={cx('min-h-11 rounded-lg border px-4 text-sm font-bold', size === n ? 'border-ink bg-ink text-bg' : 'border-line text-ink-2')}>
                {n.toLocaleString()}
              </button>
            ))}
          </div>
          <label className="text-sm font-bold">
            Custom size
            <input type="number" min={100} max={10000} step={100} value={size} onChange={(e) => setSize(Number(e.target.value))} className="mt-1 block min-h-11 w-32 rounded-lg border border-line bg-panel-2 px-3" />
          </label>
          <Button variant="primary" icon={RefreshCw} onClick={regenerate}>
            Generate dataset
          </Button>
        </div>
        <p className="mt-3 text-sm text-ink-3">
          Current: <b className="text-ink">{dataset.length.toLocaleString()}</b> residents · seed {datasetSeed}
          {broadcast && ' · regenerating clears the current broadcast'}
        </p>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Breakdown title="By zone" items={ZONES.map((z) => ({ label: z.name, value: count('zone', z.id) }))} />
        <Breakdown title="By language" items={LANGUAGES.map((l) => ({ label: l.name, value: count('language', l.code) }))} />
        <Breakdown title="By device" items={[{ label: 'Smartphone', value: count('device', 'smartphone') }, { label: 'Basic phone (SMS)', value: count('device', 'feature') }, { label: 'No phone (relay only)', value: count('device', 'none') }]} />
        <Breakdown title="By connectivity" items={[{ label: 'Good', value: count('connectivity', 'good') }, { label: 'Weak', value: count('connectivity', 'weak') }, { label: 'None', value: count('connectivity', 'none') }]} />
      </div>

      <Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-base">Residents ({filtered.length.toLocaleString()})</h2>
          <label className="relative">
            <span className="sr-only">Search dataset</span>
            <Search aria-hidden className="absolute top-3 left-3 size-4 text-ink-3" />
            <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Name, ID or zone (Z1)" className="min-h-10 rounded-lg border border-line bg-panel-2 pr-3 pl-9 text-sm" />
          </label>
        </div>
        <div className="relative overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-ink-3">
              <tr className="border-b border-line">
                {['ID', 'Name', 'Age', 'Zone', 'Language', 'Group', 'Device', 'Connectivity', 'Phone'].map((h) => (
                  <th key={h} scope="col" className="py-2">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(page * PAGE, page * PAGE + PAGE).map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="py-2 text-ink-3 tabular-nums">{p.id}</td>
                  <td className="font-bold">{p.name}</td>
                  <td>{p.age}</td>
                  <td>{p.zone}</td>
                  <td>{languageInfo(p.language).name}</td>
                  <td>{personaById(p.persona).label}</td>
                  <td>{p.device}</td>
                  <td>{p.connectivity}</td>
                  <td className="text-ink-3">{p.phone}</td>
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
