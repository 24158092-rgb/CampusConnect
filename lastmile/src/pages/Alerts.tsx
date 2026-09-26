import { Copy, Eye, History, Play, Plus, RadioTower, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCard } from '../components/alert';
import { CreateAlertDialog } from '../components/CreateAlertDialog';
import { Button, PageHeader, Panel, ProgressBar, SectionTitle, cx } from '../components/ui';
import { launchDemo } from '../data/demoScript';
import { HAZARD_ICON, HAZARD_LABEL } from '../data/languages';
import { SOURCE_SYSTEMS } from '../data/network';
import { usePipeline } from '../hooks/usePipeline';
import { useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { EmergencyAlert, HazardType } from '../types';

const TYPES: HazardType[] = ['flood', 'cyclone', 'heat', 'heavyRain'];

function HistoryRow({ alert }: { alert: EmergencyAlert }) {
  const navigate = useNavigate();
  const { completed, total } = usePipeline(alert.id);
  const selected = useStore((s) => s.selectedAlertId === alert.id);
  const demoRunning = useStore((s) => Boolean(s.demo.mode));
  const { selectAlert, resetPipeline, duplicateAlert, deleteAlert } = useStore.getState();

  return (
    <AlertCard alert={alert} selected={selected}>
      <div>
        <div className="mb-1 flex justify-between text-xs text-ink-3">
          <span>Pipeline</span>
          <span>
            {completed}/{total} stages
          </span>
        </div>
        <ProgressBar value={(completed / total) * 100} tone={completed === total ? 'ok' : 'info'} label={`${alert.id} pipeline progress`} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" icon={Eye} onClick={() => { selectAlert(alert.id); navigate('/official'); }}>
          View
        </Button>
        <Button
          size="sm"
          icon={Repeat}
          disabled={demoRunning}
          onClick={() => {
            selectAlert(alert.id);
            resetPipeline(alert.id);
            launchDemo('full');
          }}
        >
          Replay
        </Button>
        <Button
          size="sm"
          icon={Copy}
          onClick={() => {
            const id = duplicateAlert(alert.id);
            toast(`Duplicated as synthetic user-created alert ${id}.`, 'success');
          }}
        >
          Duplicate
        </Button>
        <Button size="sm" variant="primary" icon={Play} disabled={demoRunning} onClick={() => { selectAlert(alert.id); launchDemo('full'); }}>
          Start Demo
        </Button>
      </div>
      {alert.demoStatus === 'SYNTHETIC_USER_CREATED' && (
        <Button
          size="sm"
          variant="ghost"
          icon={Trash2}
          disabled={demoRunning}
          title={demoRunning ? 'Deletion is disabled while a demo is running' : undefined}
          onClick={() => {
            deleteAlert(alert.id);
            toast(`Removed user-created alert ${alert.id}.`, 'info');
          }}
        >
          Delete user-created alert
        </Button>
      )}
    </AlertCard>
  );
}

export default function Alerts() {
  const alerts = useStore((s) => s.alerts);
  const selectedId = useStore((s) => s.selectedAlertId);
  const selectAlert = useStore((s) => s.selectAlert);
  const [sourceId, setSourceId] = useState<string>('src-met');
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const source = SOURCE_SYSTEMS.find((s) => s.id === sourceId)!;

  const pickType = (type: HazardType) => {
    const match = alerts.find((a) => a.type === type && a.source === sourceId) ?? alerts.find((a) => a.type === type);
    if (!match) {
      toast(`No sample ${HAZARD_LABEL[type]} available — create one with “+ Create Demo Alert”.`, 'warning');
      return;
    }
    selectAlert(match.id);
    toast(`${match.id} received from ${source.shortName} (synthetic).`, 'info');
    navigate('/official');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Stage 1 · Source Systems"
        title="Source Systems & Alerts"
        description="Pick a synthetic source and warning type, or create your own synthetic alert to test the pipeline."
        actions={
          <Button variant="primary" icon={Plus} onClick={() => setCreateOpen(true)}>
            Create Demo Alert
          </Button>
        }
      />
      <p role="note" className="rounded-xl border-2 border-amber bg-amber/10 p-3 text-center font-mono text-sm font-extrabold tracking-wider text-amber uppercase">
        Simulation mode — all alert data is synthetic
      </p>

      <Panel>
        <SectionTitle icon={RadioTower}>Source Systems (demo labels only)</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5" role="radiogroup" aria-label="Source system">
          {SOURCE_SYSTEMS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="radio"
              aria-checked={s.id === sourceId}
              onClick={() => setSourceId(s.id)}
              className={cx('rounded-xl border p-3 text-left transition', s.id === sourceId ? 'border-info bg-info/10' : 'border-line hover:border-info/50')}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-bold text-info">{s.shortName}</span>
                <span className={cx('flex items-center gap-1 text-[0.65rem] font-bold', s.status === 'OPERATIONAL' ? 'text-ok' : 'text-warn')}>
                  <span aria-hidden className={cx('size-2 rounded-full', s.status === 'OPERATIONAL' ? 'bg-ok' : 'bg-warn')} />
                  {s.status}
                </span>
              </span>
              <span className="mt-1 block text-sm font-bold">{s.name}</span>
              <span className="mt-1 block text-xs text-ink-3">{s.description}</span>
            </button>
          ))}
        </div>
        <h3 className="mt-5 mb-2 text-sm font-bold">Receive a warning from {source.shortName}</h3>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TYPES.map((t) => {
            const supported = source.issues.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => pickType(t)}
                disabled={!supported}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-panel-2/60 p-3 text-left font-semibold transition hover:border-info disabled:opacity-40"
              >
                <span aria-hidden className="text-3xl">
                  {HAZARD_ICON[t]}
                </span>
                <span>
                  {HAZARD_LABEL[t]}
                  {!supported && <span className="block text-xs font-normal text-ink-3">Not issued by this source</span>}
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

      <section aria-labelledby="history-title">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 id="history-title" className="flex items-center gap-2 text-lg font-bold">
            <History aria-hidden className="size-5 text-info" /> Alert History
          </h2>
          <span className="text-sm text-ink-3">
            {alerts.length} synthetic alerts · selected {selectedId}
          </span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {alerts.map((a) => (
            <HistoryRow key={a.id} alert={a} />
          ))}
        </div>
      </section>

      <CreateAlertDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
