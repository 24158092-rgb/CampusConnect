import { FlaskConical } from 'lucide-react';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { HAZARD_LABEL } from '../data/languages';
import { SOURCE_SYSTEMS } from '../data/network';
import { useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import type { EmergencyAlert, HazardType, Severity } from '../types';
import { Button, Modal } from './ui';

const PREFIX: Record<HazardType, string> = { flood: 'FLD', cyclone: 'CYC', heat: 'HEAT', heavyRain: 'RAIN', severeWeather: 'WX' };

const EMPTY = {
  type: 'flood' as HazardType,
  severity: 'HIGH' as Severity,
  source: 'src-met',
  affectedArea: 'Demo River Ward 12',
  issuedAt: '20:00',
  validUntil: '23:30',
  recommendedAction: 'Move to the upper floor of a strong building',
  doNot: 'cross the river bridge',
  originalMessage: '',
};

function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ink-3">{hint}</p>}
    </div>
  );
}

const input = 'min-h-11 w-full rounded-lg border border-line bg-panel-2 px-3 text-sm';

export function CreateAlertDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [f, setF] = useState(EMPTY);
  const [error, setError] = useState('');
  const addAlert = useStore((s) => s.addAlert);
  const buildPipeline = useStore((s) => s.buildPipeline);
  const navigate = useNavigate();
  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setF((p) => ({ ...p, [k]: v }));

  const message =
    f.originalMessage ||
    `${HAZARD_LABEL[f.type].toUpperCase()} [SYNTHETIC USER-CREATED]. Issued ${f.issuedAt}. ${HAZARD_LABEL[f.type]} affecting ${f.affectedArea} from ${f.issuedAt} to ${f.validUntil}. Severity: ${f.severity}. Residents are advised to ${f.recommendedAction.toLowerCase()} immediately. Do not ${f.doNot}.`;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const required = [f.affectedArea, f.issuedAt, f.validUntil, f.recommendedAction, f.doNot];
    if (required.some((v) => !v.trim())) {
      setError('Please fill every field (the official message can be auto-drafted).');
      return;
    }
    const action = f.recommendedAction.trim().replace(/[.]+$/, '');
    const id = `${PREFIX[f.type]}-USER-${String(Math.floor(Date.now() / 1000) % 100000).padStart(5, '0')}`;
    const alert: EmergencyAlert = {
      id,
      type: f.type,
      severity: f.severity,
      source: f.source,
      issuedAt: f.issuedAt,
      validUntil: f.validUntil,
      affectedArea: f.affectedArea.trim(),
      recommendedAction: `${action}.`,
      doNot: f.doNot.trim().replace(/[.]+$/, ''),
      originalMessage: message.trim(),
      demoStatus: 'SYNTHETIC_USER_CREATED',
      actionKeywords: [action],
      entities: { location: [f.affectedArea.trim()], time: [f.issuedAt, f.validUntil], severity: [`Severity: ${f.severity}`], action: [action, f.doNot.trim()] },
      localized: { en: { area: f.affectedArea.trim(), action, doNot: f.doNot.trim().replace(/[.]+$/, '') } },
      createdAt: Date.now(),
    };
    addAlert(alert);
    buildPipeline(id);
    toast(`Synthetic alert ${id} created — pipeline built automatically.`, 'success');
    setF(EMPTY);
    setError('');
    onClose();
    navigate('/pipeline');
  };

  return (
    <Modal open={open} onClose={onClose} title="+ Create Demo Alert" wide>
      <p className="mb-4 inline-flex items-center gap-2 rounded-md border border-amber bg-amber/15 px-2 py-1 text-xs font-extrabold tracking-wider text-amber uppercase">
        <FlaskConical aria-hidden className="size-4" /> Synthetic user-created alert — for testing only
      </p>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
        <Field label="Alert type" htmlFor="ca-type">
          <select id="ca-type" className={input} value={f.type} onChange={(e) => set('type', e.target.value as HazardType)}>
            {(Object.keys(HAZARD_LABEL) as HazardType[]).map((t) => (
              <option key={t} value={t}>
                {HAZARD_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Severity" htmlFor="ca-sev">
          <select id="ca-sev" className={input} value={f.severity} onChange={(e) => set('severity', e.target.value as Severity)}>
            {(['INFO', 'WARNING', 'HIGH', 'CRITICAL'] as Severity[]).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>
        <Field label="Source system (demo)" htmlFor="ca-src">
          <select id="ca-src" className={input} value={f.source} onChange={(e) => set('source', e.target.value)}>
            {SOURCE_SYSTEMS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Affected area" htmlFor="ca-area">
          <input id="ca-area" className={input} value={f.affectedArea} onChange={(e) => set('affectedArea', e.target.value)} required />
        </Field>
        <Field label="Issued time" htmlFor="ca-issued">
          <input id="ca-issued" type="time" className={input} value={f.issuedAt} onChange={(e) => set('issuedAt', e.target.value)} required />
        </Field>
        <Field label="Valid until" htmlFor="ca-valid">
          <input id="ca-valid" type="time" className={input} value={f.validUntil} onChange={(e) => set('validUntil', e.target.value)} required />
        </Field>
        <Field label="Recommended action" htmlFor="ca-action">
          <input id="ca-action" className={input} value={f.recommendedAction} onChange={(e) => set('recommendedAction', e.target.value)} required />
        </Field>
        <Field label="Key “do not” instruction" htmlFor="ca-donot">
          <input id="ca-donot" className={input} value={f.doNot} onChange={(e) => set('doNot', e.target.value)} required />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Official message" htmlFor="ca-msg" hint="Leave empty to auto-draft from the fields above. This text becomes the immutable source of truth.">
            <textarea id="ca-msg" rows={4} className={`${input} py-2`} value={f.originalMessage} placeholder={message} onChange={(e) => set('originalMessage', e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-ink-3 sm:col-span-2">
          Hazard, severity and labels are translated from the demo phrase bank. Free-text fields (area, action) stay in your official wording in other languages and are flagged as partial translations — the system never invents a translation.
        </p>
        {error && (
          <p role="alert" className="text-sm font-semibold text-crit sm:col-span-2">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Create & build pipeline
          </Button>
        </div>
      </form>
    </Modal>
  );
}
