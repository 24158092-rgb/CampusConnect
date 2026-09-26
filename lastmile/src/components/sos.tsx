import { AnimatePresence, motion } from 'framer-motion';
import { BellRing, CircleCheck, HandHelping, Send, Siren, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ZONES, ZONE_RISK, type ZoneId } from '../data/geo';
import { SOS_TEMPLATES, type SosTemplateId } from '../data/safety';
import { useBroadcast } from '../store/useBroadcast';
import { useSelectedAlert, useStore } from '../store/useStore';
import { toast } from '../store/useToasts';
import { Button, Modal, cx } from './ui';

/** Short alarm tone (Web Audio) so the pop-up is noticed; silent when motion/sound is reduced. */
function beep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    [0, 0.28].forEach((t) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = 880;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.22);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.25);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    /* audio is optional */
  }
}

/** Phone-style notification that pops up when an alert or SOS is broadcast. */
export function SosPopup() {
  const popup = useBroadcast((s) => s.popup);
  const dismiss = useBroadcast((s) => s.dismissPopup);
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const navigate = useNavigate();

  useEffect(() => {
    if (popup && !reduced) beep();
  }, [popup, reduced]);

  return (
    <AnimatePresence>
      {popup && (
        <motion.div
          key={popup.id}
          role="alertdialog"
          aria-labelledby="sos-popup-title"
          aria-describedby="sos-popup-body"
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          className="fixed top-3 right-3 left-3 z-[70] mx-auto max-w-md overflow-hidden rounded-2xl border-2 border-crit bg-[#1f1411] shadow-2xl sm:left-auto"
        >
          <div className="flex items-center gap-2 bg-crit px-4 py-2 text-white">
            <Siren aria-hidden className="size-5 animate-pulse" />
            <p className="flex-1 text-sm font-bold tracking-wide uppercase">{popup.kind === 'sos' ? 'SOS — Emergency broadcast' : 'Emergency alert'}</p>
            <span className="text-[0.65rem] font-bold opacity-80">DEMO</span>
            <button type="button" onClick={dismiss} aria-label="Dismiss notification" className="grid size-8 place-items-center rounded-md hover:bg-black/20">
              <X aria-hidden className="size-4" />
            </button>
          </div>
          <div className="p-4">
            <p id="sos-popup-title" className="font-bold">
              {popup.title}
            </p>
            <p id="sos-popup-body" className="mt-1 text-sm leading-relaxed text-ink">
              {popup.body}
            </p>
            <p className="mt-2 text-[0.7rem] text-ink-3">Simulated notification — synthetic demo, no real alert was issued.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button size="sm" variant="success" icon={CircleCheck} onClick={() => { dismiss(); toast('Response recorded: I am safe.', 'success'); }}>
                I am safe
              </Button>
              <Button size="sm" variant="danger" icon={HandHelping} onClick={() => { dismiss(); toast('Help request flagged for responders (simulated).', 'warning'); }}>
                I need help
              </Button>
              <Button size="sm" className="col-span-2" onClick={() => { dismiss(); navigate('/safety'); }}>
                View recommended actions
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Compose and send an SOS to every resident in the dataset (or selected zones). */
export function SosComposer() {
  const open = useBroadcast((s) => s.composerOpen);
  const setOpen = useBroadcast((s) => s.setComposerOpen);
  const dataset = useBroadcast((s) => s.dataset);
  const start = useBroadcast((s) => s.start);
  const alert = useSelectedAlert();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<SosTemplateId | 'custom'>('evacuate');
  const [custom, setCustom] = useState('');
  const [scope, setScope] = useState<'all' | 'risk'>('all');
  const riskZones = ZONES.filter((z) => ZONE_RISK[alert.type][z.id] >= 3).map((z) => z.id as ZoneId);
  const count = scope === 'all' ? dataset.length : dataset.filter((p) => riskZones.includes(p.zone)).length;

  const send = () => {
    if (template === 'custom' && !custom.trim()) return;
    start({ kind: 'sos', alert, template, customText: custom.trim(), zones: scope === 'all' ? 'all' : riskZones });
    setOpen(false);
    toast(`SOS broadcast started to ${count.toLocaleString()} residents (simulated).`, 'error');
    navigate('/broadcast');
  };

  return (
    <Modal open={open} onClose={() => setOpen(false)} title="Send SOS to all residents">
      <p className="mb-4 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs font-bold text-amber">
        Simulation only — messages go to the synthetic demo dataset, not real phones.
      </p>
      <fieldset>
        <legend className="mb-2 text-sm">Message</legend>
        <div className="grid gap-2">
          {(Object.keys(SOS_TEMPLATES) as SosTemplateId[]).map((id) => (
            <label key={id} className={cx('flex cursor-pointer gap-3 rounded-lg border p-3', template === id ? 'border-crit bg-crit/10' : 'border-line')}>
              <input type="radio" name="sos-template" checked={template === id} onChange={() => setTemplate(id)} className="mt-1 accent-[var(--crit)]" />
              <span>
                <span className="block text-sm font-bold">{SOS_TEMPLATES[id].label}</span>
                <span className="block text-sm text-ink-2">{SOS_TEMPLATES[id].text.en}</span>
                <span className="block text-xs text-ink-3">Auto-sent in each resident’s language (English, Hindi, Odia, Bengali)</span>
              </span>
            </label>
          ))}
          <label className={cx('flex cursor-pointer gap-3 rounded-lg border p-3', template === 'custom' ? 'border-crit bg-crit/10' : 'border-line')}>
            <input type="radio" name="sos-template" checked={template === 'custom'} onChange={() => setTemplate('custom')} className="mt-1 accent-[var(--crit)]" />
            <span className="flex-1">
              <span className="block text-sm font-bold">Custom message (English)</span>
              <textarea
                value={custom}
                onChange={(e) => {
                  setCustom(e.target.value);
                  setTemplate('custom');
                }}
                maxLength={150}
                rows={2}
                placeholder="e.g. Boats are coming to Harbour Ward. Wait on your roof."
                aria-label="Custom SOS message"
                className="mt-2 w-full rounded-lg border border-line bg-panel-2 p-2 text-sm"
              />
              <span className="block text-right text-xs text-ink-3">{custom.length}/150 (fits one SMS)</span>
            </span>
          </label>
        </div>
      </fieldset>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm">Send to</legend>
        <div className="grid grid-cols-2 gap-2">
          <label className={cx('cursor-pointer rounded-lg border p-3 text-sm', scope === 'all' ? 'border-ink bg-panel-2' : 'border-line')}>
            <input type="radio" name="sos-scope" checked={scope === 'all'} onChange={() => setScope('all')} className="sr-only" />
            <span className="block font-bold">Everyone</span>
            <span className="text-ink-3">{dataset.length.toLocaleString()} residents</span>
          </label>
          <label className={cx('cursor-pointer rounded-lg border p-3 text-sm', scope === 'risk' ? 'border-ink bg-panel-2' : 'border-line')}>
            <input type="radio" name="sos-scope" checked={scope === 'risk'} onChange={() => setScope('risk')} className="sr-only" />
            <span className="block font-bold">High-risk zones only</span>
            <span className="text-ink-3">{dataset.filter((p) => riskZones.includes(p.zone)).length.toLocaleString()} residents</span>
          </label>
        </div>
      </fieldset>
      <div className="mt-5 flex justify-end gap-2">
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button variant="danger" icon={Send} onClick={send} disabled={template === 'custom' && !custom.trim()}>
          Send SOS to {count.toLocaleString()}
        </Button>
      </div>
    </Modal>
  );
}

export function SosButton({ className }: { className?: string }) {
  const setOpen = useBroadcast((s) => s.setComposerOpen);
  return (
    <Button variant="danger" icon={BellRing} onClick={() => setOpen(true)} className={className}>
      SOS
    </Button>
  );
}
