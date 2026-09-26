import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { ChartColumn, CircleCheck, Ellipsis, FlaskConical, Gavel, GitBranch, Image, Languages, LayoutDashboard, Megaphone, RadioTower, Send, Sparkles, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { launchDemo } from '../data/demoScript';
import { useSimulationLoop } from '../hooks/useSimulationLoop';
import { useSelectedAlert, useStore } from '../store/useStore';
import { AccessibilityControls, DemoModeController, SystemStatusPanel, useApplyA11y } from './controls';
import { PipelineStrip } from './pipeline';
import { Button, Toaster, cx } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/alerts', label: 'Alerts', icon: RadioTower },
  { to: '/official', label: 'Official Alert', icon: Megaphone },
  { to: '/pipeline', label: 'Pipeline', icon: GitBranch },
  { to: '/clarity', label: 'Clarity Processor', icon: Sparkles },
  { to: '/language', label: 'Language Bank', icon: Languages },
  { to: '/visual', label: 'Visual Studio', icon: Image },
  { to: '/delivery', label: 'Delivery Simulator', icon: Send },
  { to: '/receipts', label: 'Receipt Tracker', icon: CircleCheck },
  { to: '/analytics', label: 'Analytics', icon: ChartColumn },
];

const MOBILE_PRIMARY = ['/', '/alerts', '/clarity', '/delivery'];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-2.5" aria-label="LASTMILE home">
      <svg aria-hidden viewBox="0 0 32 32" className="size-9">
        <rect width="32" height="32" rx="8" fill="var(--panel-2)" stroke="var(--line)" />
        <path d="M16 5 L28 26 H4 Z" fill="none" stroke="var(--info)" strokeWidth="2.6" strokeLinejoin="round" />
        <circle cx="16" cy="20.5" r="2.4" fill="var(--warn)" />
        <path d="M16 11 v5" stroke="var(--warn)" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-lg font-black tracking-[0.12em]">LASTMILE</span>
        <span className="hidden text-[0.68rem] font-medium text-ink-3 sm:block">Emergency Communication Intelligence Platform</span>
      </span>
    </NavLink>
  );
}

export function Layout() {
  useApplyA11y();
  useSimulationLoop();
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const demoMode = useStore((s) => s.demo.mode);
  const nodes = useStore((s) => s.nodes);
  const alert = useSelectedAlert();
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const degraded = nodes.some((n) => n.status !== 'online' && n.kind !== 'cluster');

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <a href="#main" className="skip-link rounded-lg bg-amber px-4 py-2 font-bold text-slate-950">
        Skip to main content
      </a>
      <div className="bg-grid min-h-screen">
        {/* Persistent simulation banner */}
        <div role="note" className="flex items-center justify-center gap-2 bg-amber px-3 py-1.5 text-center text-[0.72rem] font-extrabold tracking-wider text-slate-950 uppercase">
          <FlaskConical aria-hidden className="size-4 shrink-0" />
          Simulation mode — all alert data is synthetic. No real alerts, SMS or government systems are used.
        </div>

        <header className="glass sticky top-0 z-30 border-x-0 border-t-0">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
            <Logo />
            <div className="flex items-center gap-2">
              <span className="hidden items-center gap-2 rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs font-bold md:flex" title="System status">
                <span aria-hidden className={cx('size-2.5 rounded-full', degraded ? 'pulse-ring bg-warn text-warn' : 'bg-ok shadow-[0_0_8px_var(--ok)]')} />
                {degraded ? 'SYSTEMS: PARTIAL (RELAY DEGRADED)' : 'ALL SYSTEMS OPERATIONAL'}
              </span>
              <span className="hidden items-center gap-1.5 rounded-lg border border-amber/70 bg-amber/10 px-2.5 py-2 font-mono text-[0.7rem] font-extrabold text-amber sm:flex">
                <FlaskConical aria-hidden className="size-3.5" /> DEMO MODE
              </span>
              <AccessibilityControls />
              <Button variant="primary" icon={Gavel} onClick={() => launchDemo('judge')} disabled={Boolean(demoMode)} className="hidden sm:inline-flex">
                JUDGE DEMO
              </Button>
            </div>
          </div>
        </header>

        <div className="flex">
          {/* Desktop sidebar */}
          <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 shrink-0 flex-col gap-4 overflow-y-auto border-r border-line p-4 lg:flex" aria-label="Primary">
            <nav>
              <ul className="space-y-1">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.to === '/'}
                      className={({ isActive }) =>
                        cx('flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition', isActive ? 'bg-info/15 text-info shadow-[inset_3px_0_0_var(--info)]' : 'text-ink-2 hover:bg-panel-2 hover:text-ink')
                      }
                    >
                      <n.icon aria-hidden className="size-5" />
                      {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto rounded-xl border border-line bg-panel/60 p-3">
              <SystemStatusPanel />
            </div>
          </aside>

          <main id="main" className="min-w-0 flex-1 px-4 pt-4 pb-40 lg:px-8 lg:pb-12">
            <div className="mb-4 flex flex-col gap-2 rounded-xl border border-line bg-panel/50 px-3 py-2 sm:flex-row sm:items-center">
              <p className="shrink-0 text-xs text-ink-3">
                Active alert: <b className="font-mono text-ink">{alert.id}</b>
              </p>
              <div className="min-w-0 flex-1">
                <PipelineStrip alertId={alert.id} />
              </div>
            </div>
            <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
              <Outlet />
            </motion.div>
            <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-3">
              LASTMILE is a hackathon demonstration. All alerts, agencies, places, recipients and translations are synthetic. It does not connect to any government system,
              emergency network or SMS gateway. Translations are pre-authored demo content, not certified translations.
            </footer>
          </main>
        </div>

        {/* Mobile bottom navigation */}
        <nav aria-label="Primary mobile" className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-5">
            {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold', isActive ? 'text-info' : 'text-ink-3')}>
                  <n.icon aria-hidden className="size-5" />
                  {n.label.split(' ')[0]}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold text-ink-3">
                <Ellipsis aria-hidden className="size-5" /> More
              </button>
            </li>
          </ul>
        </nav>

        <AnimatePresence>
          {moreOpen && (
            <motion.div className="fixed inset-0 z-50 bg-black/70 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoreOpen(false)}>
              <motion.div
                role="dialog"
                aria-label="All modules"
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="glass absolute inset-x-0 bottom-0 rounded-t-2xl p-4 pb-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-bold">All modules</p>
                  <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-lg hover:bg-panel-2">
                    <X aria-hidden className="size-5" />
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {NAV.map((n) => (
                    <li key={n.to}>
                      <NavLink to={n.to} end={n.to === '/'} onClick={() => setMoreOpen(false)} className={({ isActive }) => cx('flex min-h-12 items-center gap-2 rounded-lg border px-3 text-sm font-semibold', isActive ? 'border-info text-info' : 'border-line text-ink-2')}>
                        <n.icon aria-hidden className="size-4" />
                        {n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
                <Button variant="primary" icon={Gavel} className="mt-3 w-full" disabled={Boolean(demoMode)} onClick={() => { setMoreOpen(false); launchDemo('judge'); }}>
                  JUDGE DEMO
                </Button>
                <div className="mt-4 rounded-xl border border-line p-3">
                  <SystemStatusPanel />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <DemoModeController />
        <Toaster />
      </div>
    </MotionConfig>
  );
}
