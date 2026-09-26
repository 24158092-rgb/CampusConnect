import { FlaskConical, LogIn, ShieldCheck, Smartphone } from 'lucide-react';
import { useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, cx } from '../components/ui';
import { ZONES, type ZoneId } from '../data/geo';
import { LANGUAGES } from '../data/languages';
import { useBroadcast } from '../store/useBroadcast';
import { useSession } from '../store/useSession';
import type { LanguageCode } from '../types';
import { unlockAudio } from '../utils/siren';

const input = 'min-h-12 w-full rounded-lg border border-line bg-panel-2 px-3 text-base';

export default function Login() {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<'admin' | 'user'>(params.get('as') === 'user' ? 'user' : 'admin');
  const navigate = useNavigate();
  const { loginAdmin, loginUser } = useSession();
  const dataset = useBroadcast((s) => s.dataset);

  const [username, setUsername] = useState('admin');
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState('');

  const [zone, setZone] = useState<ZoneId>('Z1');
  const [language, setLanguage] = useState<LanguageCode>('or');
  const resident = useMemo(() => {
    const idx = dataset.findIndex((p) => p.zone === zone && p.language === language);
    return idx >= 0 ? idx : dataset.findIndex((p) => p.zone === zone);
  }, [dataset, zone, language]);

  const submitAdmin = (e: FormEvent) => {
    e.preventDefault();
    if (username.trim().toLowerCase() !== 'admin' || pin !== '1234') {
      setError('Demo credentials are admin / 1234.');
      return;
    }
    unlockAudio();
    loginAdmin('Control room operator');
    navigate('/');
  };

  const submitUser = (e: FormEvent) => {
    e.preventDefault();
    if (resident < 0) return;
    unlockAudio();
    loginUser(resident, dataset[resident].name, language);
    navigate('/resident');
  };

  return (
    <div className="bg-grid flex min-h-screen flex-col">
      <div role="note" className="flex items-center justify-center gap-2 bg-amber px-3 py-1 text-center text-xs font-bold text-slate-950">
        <FlaskConical aria-hidden className="size-3.5" /> DEMO LOGIN — no real accounts. All people and messages are synthetic.
      </div>
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-10">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-lg bg-crit text-white">
            <svg aria-hidden viewBox="0 0 32 32" className="size-7">
              <path d="M16 6 L27 25 H5 Z" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinejoin="round" />
              <path d="M16 12.5 v5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="16" cy="21" r="1.7" fill="currentColor" />
            </svg>
          </span>
          <div>
            <h1 className="text-3xl">LastMile</h1>
            <p className="text-ink-3">Emergency warnings that reach everyone — understandable, accessible, reachable.</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2" role="tablist" aria-label="Login type">
          {(
            [
              ['admin', 'Admin / Control room', ShieldCheck, 'Issue alerts, send SOS, monitor responses'],
              ['user', 'User / Resident', Smartphone, 'Receive alerts and SOS alarms on your phone'],
            ] as const
          ).map(([id, label, Icon, desc]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={mode === id}
              onClick={() => setMode(id)}
              className={cx('flex items-start gap-3 rounded-xl border p-4 text-left', mode === id ? 'border-ink bg-panel-2' : 'border-line hover:bg-panel')}
            >
              <Icon aria-hidden className={cx('mt-0.5 size-6 shrink-0', mode === id ? 'text-crit' : 'text-ink-3')} />
              <span>
                <span className="block text-base font-bold">{label}</span>
                <span className="block text-sm text-ink-3">{desc}</span>
              </span>
            </button>
          ))}
        </div>

        <section className="glass rounded-2xl p-6" role="tabpanel">
          {mode === 'admin' ? (
            <form onSubmit={submitAdmin} className="grid gap-4 sm:max-w-md">
              <div>
                <label htmlFor="lg-user" className="mb-1 block text-sm">
                  Username
                </label>
                <input id="lg-user" className={input} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
              <div>
                <label htmlFor="lg-pin" className="mb-1 block text-sm">
                  PIN
                </label>
                <input id="lg-pin" type="password" inputMode="numeric" className={input} value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="current-password" />
                <p className="mt-1 text-xs text-ink-3">Demo credentials are pre-filled: admin / 1234</p>
              </div>
              {error && (
                <p role="alert" className="text-sm font-bold text-crit">
                  {error}
                </p>
              )}
              <Button type="submit" variant="primary" size="lg" icon={LogIn}>
                Log in as Admin
              </Button>
            </form>
          ) : (
            <form onSubmit={submitUser} className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="lg-zone" className="mb-1 block text-sm">
                  Where do you live?
                </label>
                <select id="lg-zone" className={input} value={zone} onChange={(e) => setZone(e.target.value as ZoneId)}>
                  {ZONES.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name} ({z.id})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="lg-lang" className="mb-1 block text-sm">
                  Preferred language
                </label>
                <select id="lg-lang" className={input} value={language} onChange={(e) => setLanguage(e.target.value as LanguageCode)}>
                  {LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.nativeName} — {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="rounded-lg border border-line bg-panel-2 p-3 text-sm sm:col-span-2">
                You will log in as synthetic resident <b>{resident >= 0 ? dataset[resident].name : '—'}</b>
                {resident >= 0 && <span className="text-ink-3"> · ID {dataset[resident].id} · {dataset[resident].phone}</span>}
              </p>
              <p className="text-xs text-ink-3 sm:col-span-2">
                Tip: keep this resident tab open next to an Admin tab. When the admin sends an SOS, this screen rings an alarm and shows a full-screen notification.
              </p>
              <Button type="submit" variant="primary" size="lg" icon={LogIn} className="sm:col-span-2 sm:justify-self-start">
                Log in as User
              </Button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
