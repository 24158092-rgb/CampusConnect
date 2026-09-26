import { HAZARD_LABEL } from '../data/languages';
import { useSelectedAlert, useStore } from '../store/useStore';
import { HazardIcon } from './icons';
import { PipelineStrip } from './pipeline';
import { cx } from './ui';

/** Alert switcher + pipeline progress, shown at the top of the Alerts section. */
export function ActiveAlertBar() {
  const alert = useSelectedAlert();
  const alerts = useStore((s) => s.alerts);
  const selectAlert = useStore((s) => s.selectAlert);
  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Choose alert">
        {alerts.slice(0, 6).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => selectAlert(a.id)}
            aria-pressed={a.id === alert.id}
            className={cx('flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-bold', a.id === alert.id ? 'border-ink bg-panel-2 text-ink' : 'border-line text-ink-3 hover:text-ink')}
          >
            <HazardIcon type={a.type} tile={false} className="size-4" />
            {HAZARD_LABEL[a.type].replace(' Warning', '')}
            <span className="text-xs font-normal text-ink-3">{a.id}</span>
          </button>
        ))}
      </div>
      <PipelineStrip alertId={alert.id} />
    </div>
  );
}
