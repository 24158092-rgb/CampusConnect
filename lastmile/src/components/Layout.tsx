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
    <NavLink to="/" className="flex items-center gap-3" aria-label="LASTMILE home">
      <span className="relative grid size-10 place-items-center rounded-xl bg-ink">
        <svg aria-hidden viewBox="0 0 32 32" className="size-6">
          <path d="M16 6 L27 25 H5 Z" fill="none" stroke="var(--bg)" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M16 12.5 v5" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="16" cy="21" r="1.6" fill="var(--accent)" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block font-display text-xl font-medium tracking-[0.08em]">LastMile</span>
        <span className="block font-mono text-[0.6rem] tracking-wider text-ink-3 uppercase">Warning ops desk</span>
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
      <div className="bg-grid min-h-screen lg:p-5">
        <div className="device-frame flex min-h-screen lg:min-h-[calc(100vh-2.5rem)] lg:rounded-[1.25rem]">
          {/* Desktop sidebar */}
          <aside className="sticky top-5 hidden h-[calc(100vh-2.5rem)] w-64 shrink-0 flex-col gap-4 p-4 lg:flex" aria-label="Primary">
            <div className="glass flex h-full flex-col gap-6 overflow-y-auto rounded-2xl p-4 scrollbar-thin">
              <Logo />
              <nav>
                <ul className="space-y-1">
                  {NAV.map((n) => (
                    <li key={n.to}>
                      <NavLink
                        to={n.to}
                        end={n.to === '/'}
                        className={({ isActive }) =>
                          cx(
                            'group flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[0.72rem] font-medium tracking-[0.12em] uppercase transition',
                            isActive ? 'bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.05)]' : 'text-ink-3 hover:bg-white/[0.03] hover:text-ink',
                          )
                        }
                      >
                        {({ isActive }) => (
                          <>
                            <n.icon aria-hidden className={cx('size-[1.1rem]', isActive ? 'text-accent' : '')} />
                            <span className="flex-1">{n.label}</span>
                            {isActive && <span aria-hidden className="size-1.5 rounded-full bg-accent" />}
                          </>
                        )}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </nav>
              <div className="mt-auto rounded-2xl border border-line bg-black/20 p-3">
                <SystemStatusPanel compact />
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 bg-frame/85 backdrop-blur-xl lg:top-5 lg:rounded-t-[2rem]">
              <div role="note" className="flex items-center justify-center gap-2 border-b border-amber/30 bg-amber/10 px-3 py-1.5 text-center text-[0.68rem] font-semibold tracking-[0.12em] text-amber uppercase lg:mx-4 lg:mt-4 lg:rounded-full lg:border">
                <FlaskConical aria-hidden className="size-3.5 shrink-0" />
                Simulation mode — all alert data is synthetic · no real alerts, SMS or government systems
              </div>
              <div className="flex items-center justify-between gap-3 px-4 py-3 lg:px-6">
                <div className="lg:hidden">
                  <Logo />
                </div>
                <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
                  <span className="label-caps shrink-0">Active alert</span>
                  <span className="shrink-0 rounded-full border border-line bg-panel px-3 py-1 font-mono text-xs">{alert.id}</span>
                  <div className="min-w-0 flex-1">
                    <PipelineStrip alertId={alert.id} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="hidden items-center gap-2 rounded-full border border-line bg-panel px-3 py-2 text-[0.68rem] font-medium tracking-[0.1em] uppercase 2xl:flex" title="System status">
                    <span aria-hidden className={cx('size-2 rounded-full', degraded ? 'pulse-ring bg-warn text-warn' : 'bg-ok')} />
                    {degraded ? 'Relay degraded' : 'All systems operational'}
                  </span>
                  <span className="hidden items-center gap-1.5 rounded-full border border-amber/50 px-3 py-2 font-mono text-[0.65rem] font-bold text-amber xl:flex">
                    <FlaskConical aria-hidden className="size-3.5" /> DEMO MODE
                  </span>
                  <AccessibilityControls />
                  <Button variant="primary" icon={Gavel} onClick={() => launchDemo('judge')} disabled={Boolean(demoMode)} className="hidden sm:inline-flex">
                    Judge Demo
                  </Button>
                </div>
              </div>
              <div className="px-4 pb-3 lg:hidden">
                <PipelineStrip alertId={alert.id} />
              </div>
            </header>

            <main id="main" className="min-w-0 px-4 pt-2 pb-40 lg:px-6 lg:pb-10">
              <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                <Outlet />
              </motion.div>
              <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-3">
                LASTMILE is a hackathon demonstration. All alerts, agencies, places, recipients and translations are synthetic. It does not connect to any government system,
                emergency network or SMS gateway. Translations are pre-authored demo content, not certified translations.
              </footer>
            </main>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav aria-label="Primary mobile" className="glass fixed inset-x-2 bottom-2 z-40 rounded-2xl pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-5">
            {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.65rem] font-medium tracking-wide uppercase', isActive ? 'text-accent' : 'text-ink-3')}>
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
                className="glass absolute inset-x-0 bottom-0 rounded-t-3xl p-4 pb-8"
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
                      <NavLink to={n.to} end={n.to === '/'} onClick={() => setMoreOpen(false)} className={({ isActive }) => cx('flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-sm font-medium', isActive ? 'border-accent text-accent' : 'border-line text-ink-2')}>
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
