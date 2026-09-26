import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { BellRing, CircleCheck, Database, Ellipsis, FlaskConical, Gavel, LayoutDashboard, LogOut, Map as MapIcon, Phone, Send, ShieldCheck, Wifi, WifiOff, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { launchDemo } from '../data/demoScript';
import { useBroadcastLoop } from '../hooks/useBroadcastLoop';
import { useSimulationLoop } from '../hooks/useSimulationLoop';
import { useBroadcast } from '../store/useBroadcast';
import { useSession } from '../store/useSession';
import { useStore } from '../store/useStore';
import { AccessibilityControls, DemoModeController, SystemStatusPanel, useApplyA11y } from './controls';
import { SosButton, SosComposer, SosPopup } from './sos';
import { Button, Toaster, cx } from './ui';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

/** Seven sections only — every older module now lives as a tab inside one of these. */
export const NAV: NavItem[] = [
  { to: '/', label: 'Command Center', icon: LayoutDashboard, description: 'Overview of the active disaster' },
  { to: '/alerts', label: 'Alerts', icon: BellRing, description: 'Official alert, simplified & translated versions' },
  { to: '/map', label: 'Live Map', icon: MapIcon, description: 'Disaster zones and relief sites' },
  { to: '/broadcast', label: 'Broadcast & SOS', icon: Send, description: 'Send to every resident' },
  { to: '/responses', label: 'Responses', icon: CircleCheck, description: 'Who received and who needs help' },
  { to: '/safety', label: 'Safety & Contacts', icon: Phone, description: 'Precautions and helplines' },
  { to: '/dataset', label: 'Dataset', icon: Database, description: 'Temporary demo population' },
];

const MOBILE_PRIMARY = ['/', '/alerts', '/map', '/broadcast'];

function Logo() {
  return (
    <NavLink to="/" className="flex items-center gap-3" aria-label="LastMile home">
      <span className="grid size-10 place-items-center rounded-lg bg-crit text-white">
        <svg aria-hidden viewBox="0 0 32 32" className="size-6">
          <path d="M16 6 L27 25 H5 Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
          <path d="M16 12.5 v5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="16" cy="21" r="1.7" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-lg font-bold">LastMile</span>
        <span className="hidden text-xs text-ink-3 sm:block">Emergency warnings</span>
      </span>
    </NavLink>
  );
}

function ConnectionPill() {
  const offlineSim = useBroadcast((s) => s.offlineSim);
  const browserOnline = useBroadcast((s) => s.browserOnline);
  const setOfflineSim = useBroadcast((s) => s.setOfflineSim);
  const offline = offlineSim || !browserOnline;
  return (
    <button
      type="button"
      onClick={() => setOfflineSim(!offlineSim)}
      aria-pressed={offlineSim}
      title={browserOnline ? 'Click to simulate going offline' : 'Your device is offline — LastMile keeps working from its local copy'}
      className={cx('flex min-h-10 items-center gap-2 rounded-lg border px-3 text-sm font-bold', offline ? 'border-warn/60 bg-warn/15 text-warn' : 'border-line text-ok')}
    >
      {offline ? <WifiOff aria-hidden className="size-4" /> : <Wifi aria-hidden className="size-4" />}
      <span className="hidden sm:inline">{offline ? (browserOnline ? 'Offline (simulated)' : 'Offline') : 'Online'}</span>
    </button>
  );
}

export function Layout() {
  useApplyA11y();
  useSimulationLoop();
  useBroadcastLoop();
  const reduced = useStore((s) => s.a11y.reducedMotion);
  const demoMode = useStore((s) => s.demo.mode);
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const logout = useSession((s) => s.logout);
  const navigate = useNavigate();
  const current = NAV.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to))) ?? NAV[0];

  return (
    <MotionConfig reducedMotion={reduced ? 'always' : 'user'}>
      <a href="#main" className="skip-link rounded-lg bg-amber px-4 py-2 font-bold text-slate-950">
        Skip to main content
      </a>
      <div className="bg-grid min-h-screen">
        <div className="flex min-h-screen">
          {/* Desktop sidebar */}
          <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r border-line bg-frame p-4 lg:flex" aria-label="Primary">
            <Logo />
            <nav>
              <ul className="space-y-1">
                {NAV.map((n) => (
                  <li key={n.to}>
                    <NavLink
                      to={n.to}
                      end={n.to === '/'}
                      className={({ isActive }) =>
                        cx('flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-bold transition', isActive ? 'bg-panel-2 text-ink shadow-[inset_3px_0_0_var(--crit)]' : 'text-ink-2 hover:bg-panel hover:text-ink')
                      }
                    >
                      <n.icon aria-hidden className="size-5 shrink-0" />
                      {n.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="mt-auto space-y-3">
              <Button variant="primary" icon={Gavel} className="w-full" disabled={Boolean(demoMode)} onClick={() => launchDemo('judge')}>
                Run Judge Demo
              </Button>
              <div className="rounded-lg border border-line bg-panel p-3">
                <SystemStatusPanel compact />
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 border-b border-line bg-bg">
              <div role="note" className="flex items-center justify-center gap-2 bg-amber px-3 py-1 text-center text-xs font-bold text-slate-950">
                <FlaskConical aria-hidden className="size-3.5 shrink-0" />
                DEMO — all alerts, people and messages are synthetic. Nothing is sent to real phones.
              </div>
              <div className="flex items-center gap-2 px-3 py-3 sm:gap-3 sm:px-4 lg:px-8">
                <div className="min-w-0 lg:hidden">
                  <Logo />
                </div>
                <div className="hidden min-w-0 flex-1 lg:block">
                  <p className="truncate text-xl font-bold">{current.label}</p>
                  <p className="truncate text-sm text-ink-3">{current.description}</p>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                  <span className="hidden items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-bold text-ink-2 xl:flex">
                    <ShieldCheck aria-hidden className="size-4 text-ok" /> Admin
                  </span>
                  <ConnectionPill />
                  <AccessibilityControls />
                  <SosButton />
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      navigate('/login');
                    }}
                    aria-label="Log out"
                    title="Log out"
                    className="hidden size-10 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink sm:grid"
                  >
                    <LogOut aria-hidden className="size-4" />
                  </button>
                </div>
              </div>
            </header>

            <main id="main" className="min-w-0 px-4 pt-6 pb-32 lg:px-8 lg:pb-12">
              <motion.div key={location.pathname.split('/')[1]} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                <Outlet />
              </motion.div>
              <footer className="mt-12 border-t border-line pt-4 text-xs text-ink-3">
                LastMile is a hackathon demonstration. All alerts, agencies, places, residents and translations are synthetic. It does not connect to any government system,
                emergency network or SMS gateway. The national helpline numbers on the Safety page are real and should only be used in a real emergency.
              </footer>
            </main>
          </div>
        </div>

        {/* Mobile bottom navigation */}
        <nav aria-label="Primary mobile" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-frame pb-[env(safe-area-inset-bottom)] lg:hidden">
          <ul className="grid grid-cols-5">
            {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map((n) => (
              <li key={n.to}>
                <NavLink to={n.to} end={n.to === '/'} className={({ isActive }) => cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[0.68rem] font-bold', isActive ? 'text-ink' : 'text-ink-3')}>
                  <n.icon aria-hidden className="size-5" />
                  {n.label.split(' ')[0]}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} className="flex min-h-16 w-full flex-col items-center justify-center gap-1 text-[0.68rem] font-bold text-ink-3">
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
                aria-label="All sections"
                initial={{ y: 300 }}
                animate={{ y: 0 }}
                exit={{ y: 300 }}
                className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-line bg-frame p-4 pb-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-bold">All sections</p>
                  <button type="button" onClick={() => setMoreOpen(false)} aria-label="Close menu" className="grid size-10 place-items-center rounded-lg hover:bg-panel-2">
                    <X aria-hidden className="size-5" />
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-2">
                  {NAV.map((n) => (
                    <li key={n.to}>
                      <NavLink to={n.to} end={n.to === '/'} onClick={() => setMoreOpen(false)} className={({ isActive }) => cx('flex min-h-12 items-center gap-2 rounded-lg border px-3 text-sm font-bold', isActive ? 'border-ink text-ink' : 'border-line text-ink-2')}>
                        <n.icon aria-hidden className="size-4" />
                        {n.label}
                      </NavLink>
                    </li>
                  ))}
                </ul>
                <Button variant="primary" icon={Gavel} className="mt-3 w-full" disabled={Boolean(demoMode)} onClick={() => { setMoreOpen(false); launchDemo('judge'); }}>
                  Run Judge Demo
                </Button>
                <Button icon={LogOut} className="mt-2 w-full" onClick={() => { setMoreOpen(false); logout(); navigate('/login'); }}>
                  Log out
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <SosComposer />
        <SosPopup />
        <DemoModeController />
        <Toaster />
      </div>
    </MotionConfig>
  );
}
