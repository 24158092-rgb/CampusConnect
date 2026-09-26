import { AnimatePresence, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { CircleCheck, Info, TriangleAlert, X, OctagonAlert } from 'lucide-react';
import { createContext, useContext, useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useToasts } from '../store/useToasts';

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-bg hover:bg-white',
  secondary: 'bg-transparent text-ink border border-line hover:border-ink/40 hover:bg-panel-2',
  ghost: 'text-ink-2 hover:text-ink hover:bg-panel-2',
  danger: 'bg-crit text-white hover:brightness-110',
  success: 'bg-ok text-slate-950 hover:brightness-110',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ variant = 'secondary', icon: Icon, size = 'md', className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' && 'min-h-9 px-3 text-sm',
        size === 'md' && 'min-h-11 px-4 text-sm',
        size === 'lg' && 'min-h-12 px-5 text-base',
        VARIANT[variant],
        className,
      )}
    >
      {Icon && <Icon aria-hidden className={size === 'sm' ? 'size-4' : 'size-5'} />}
      {children}
    </button>
  );
}

export function Panel({ className, children, id, label }: { className?: string; children: ReactNode; id?: string; label?: string }) {
  return (
    <section id={id} aria-label={label} className={cx('glass rounded-2xl p-5 sm:p-6', className)}>
      {children}
    </section>
  );
}

/** When a page is rendered as a tab inside a section, its big header collapses to a toolbar. */
export const EmbeddedContext = createContext(false);

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  const embedded = useContext(EmbeddedContext);
  if (embedded) {
    return (
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg">{title}</h2>
          {description && <p className="mt-0.5 max-w-3xl text-sm text-ink-3">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    );
  }
  return (
    <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="label-caps text-ink-3 lg:hidden">{eyebrow}</p>
        {/* On desktop the page title already sits in the top bar. */}
        <h1 className="mt-1 text-3xl sm:text-4xl lg:sr-only">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-ink-2 lg:mt-0">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export interface TabDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  hint?: string;
}

/** Route-backed tabs: /section/:tab. */
export function RouteTabs({ base, tabs, active }: { base: string; tabs: TabDef[]; active: string }) {
  return (
    <nav aria-label="Section tabs" className="scrollbar-thin relative mb-6 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {tabs.map((t) => (
          <li key={t.id}>
            <Link
              to={`${base}/${t.id}`}
              aria-current={active === t.id ? 'page' : undefined}
              className={cx(
                'flex min-h-12 items-center gap-2 border-b-2 px-4 text-sm font-bold transition',
                active === t.id ? 'border-crit text-ink' : 'border-transparent text-ink-3 hover:text-ink',
              )}
            >
              {t.icon && <t.icon aria-hidden className="size-4" />}
              {t.label}
              {t.hint && <span className="rounded bg-panel-2 px-1.5 py-0.5 text-[0.65rem] text-ink-3">{t.hint}</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function SectionTitle({ icon: Icon, children, right }: { icon?: LucideIcon; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-base">
        {Icon && <Icon aria-hidden className="size-5 text-ink-3" />}
        {children}
      </h2>
      {right}
    </div>
  );
}

export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-bold tracking-wider uppercase', className)}>
      {children}
    </span>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const id = useId();
  return (
    <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start justify-between gap-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {description && <span className="block text-xs text-ink-3">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
        <span className="h-6 w-11 rounded-full border border-line bg-panel-2 transition peer-checked:bg-info peer-focus-visible:outline-3 peer-focus-visible:outline-amber" />
        <span className="absolute top-1 left-1 size-4 rounded-full bg-ink-2 transition peer-checked:translate-x-5 peer-checked:bg-white" />
      </span>
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-lg border border-line bg-panel-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx('min-h-9 rounded-md px-3.5 text-sm font-medium transition', value === o.value ? 'bg-ink text-bg' : 'text-ink-2 hover:text-ink')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line p-8 text-center">
      <Icon aria-hidden className="mb-3 size-10 text-ink-3" />
      <p className="font-semibold">{title}</p>
      {children && <p className="mt-1 max-w-md text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const f = ref.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.querySelector<HTMLElement>('input, select, textarea, button')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            className={cx('glass scrollbar-thin max-h-[92vh] w-full overflow-y-auto rounded-t-3xl p-6 sm:rounded-2xl', wide ? 'sm:max-w-4xl' : 'sm:max-w-xl')}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <h2 id={titleId} className="text-lg font-bold">
                {title}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close dialog" className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-2 hover:bg-panel-2 hover:text-ink">
                <X aria-hidden className="size-5" />
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const TOAST_ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, error: OctagonAlert };
const TOAST_TONE = { info: 'border-info/60', success: 'border-ok/60', warning: 'border-warn/60', error: 'border-crit/60' };
const TOAST_TEXT = { info: 'text-info', success: 'text-ok', warning: 'text-warn', error: 'text-crit' };

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 lg:bottom-6 lg:items-end">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = TOAST_ICON[t.kind];
          return (
            <motion.div key={t.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} className={cx('glass pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border-l-4 p-3 shadow-xl', TOAST_TONE[t.kind])}>
              <Icon aria-hidden className={cx('mt-0.5 size-5 shrink-0', TOAST_TEXT[t.kind])} />
              <p className="flex-1 text-sm">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss notification" className="text-ink-3 hover:text-ink">
                <X aria-hidden className="size-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function ProgressBar({ value, tone = 'info', label }: { value: number; tone?: 'info' | 'ok' | 'warn' | 'crit'; label: string }) {
  const bg = { info: 'bg-accent', ok: 'bg-ok', warn: 'bg-warn', crit: 'bg-crit' }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div className={cx('h-full rounded-full', bg)} initial={false} animate={{ width: `${value}%` }} transition={{ duration: 0.4 }} />
    </div>
  );
}
