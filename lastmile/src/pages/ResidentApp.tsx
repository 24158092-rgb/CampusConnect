import { AnimatePresence, motion } from 'framer-motion';
import { Bell, BellRing, CircleCheck, HandHelping, House, Inbox, LogOut, MapPin, Phone, Siren, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DisasterMap } from '../components/DisasterMap';
import { PrecautionsCard } from '../components/Precautions';
import { Button, cx } from '../components/ui';
import { RELIEF_SITES, RISK_LABEL, ZONE_RISK, siteUsable, zoneById } from '../data/geo';
import { HAZARD_LABEL, LANGUAGES, languageInfo } from '../data/languages';
import { EMERGENCY_CONTACTS } from '../data/safety';
import { useBroadcast } from '../store/useBroadcast';
import { useSession } from '../store/useSession';
import { useSelectedAlert } from '../store/useStore';
import type { LanguageCode } from '../types';
import { lastMessage, onBus, postBus, type IncomingMessage } from '../utils/bus';
import { clock } from '../utils/time';
import { startSiren, stopSiren, unlockAudio } from '../utils/siren';

interface InboxItem extends IncomingMessage {
  forMe: boolean;
  response: 'safe' | 'help' | null;
}

const INBOX_KEY = 'lastmile-resident-inbox';

function loadInbox(): InboxItem[] {
  try {
    return JSON.parse(sessionStorage.getItem(INBOX_KEY) ?? '[]') as InboxItem[];
  } catch {
    return [];
  }
}

/** Resident (user) view: a phone-style app that rings an SOS alarm when the admin broadcasts. */
export default function ResidentApp() {
  const session = useSession();
  const navigate = useNavigate();
  const dataset = useBroadcast((s) => s.dataset);
  const fallbackAlert = useSelectedAlert();
  const person = session.personIndex !== null ? dataset[session.personIndex] : undefined;
  const [inbox, setInbox] = useState<InboxItem[]>(loadInbox);
  const [ringing, setRinging] = useState<InboxItem | null>(null);
  const [muted, setMuted] = useState(false);
  const [lang, setLang] = useState<LanguageCode>(session.language);

  useEffect(() => {
    try {
      sessionStorage.setItem(INBOX_KEY, JSON.stringify(inbox.slice(0, 20)));
    } catch {
      /* optional */
    }
  }, [inbox]);

  // Show the latest message already sent before this resident logged in (no alarm for old news).
  useEffect(() => {
    const last = lastMessage();
    if (last && !loadInbox().some((m) => m.id === last.id)) {
      setInbox((l) => [{ ...last, forMe: last.zones === 'all' || (person ? last.zones.includes(person.zone) : true), response: null }, ...l]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () =>
      onBus((msg) => {
        if (msg.type !== 'broadcast') return;
        const m = msg.message;
        const forMe = m.zones === 'all' || (person ? m.zones.includes(person.zone) : true);
        const item: InboxItem = { ...m, forMe, response: null };
        setInbox((l) => [item, ...l.filter((x) => x.id !== m.id)]);
        if (!forMe) return;
        setRinging(item);
        setMuted(false);
        startSiren();
        try {
          if ('Notification' in window && Notification.permission === 'granted') new Notification(`[DEMO] ${m.title}`, { body: m.text[lang], tag: m.id, requireInteraction: true });
        } catch {
          /* optional */
        }
      }),
    [person, lang],
  );

  useEffect(() => () => stopSiren(), []);

  const respond = (item: InboxItem, safe: boolean) => {
    stopSiren();
    setRinging(null);
    setInbox((l) => l.map((x) => (x.id === item.id ? { ...x, response: safe ? 'safe' : 'help' } : x)));
    if (person) postBus({ type: 'response', personId: person.id, name: person.name, safe, broadcastId: item.id });
  };

  const latest = inbox[0];
  const hazard = latest?.hazard ?? fallbackAlert.type;
  const risk = person ? ZONE_RISK[hazard][person.zone] : 0;
  const shelter = useMemo(() => {
    if (!person) return null;
    const usable = RELIEF_SITES.filter((s) => s.kind === 'shelter' && siteUsable(s, hazard));
    return usable.sort((a, b) => (a.x - person.x) ** 2 + (a.y - person.y) ** 2 - ((b.x - person.x) ** 2 + (b.y - person.y) ** 2))[0] ?? null;
  }, [person, hazard]);
  const distanceKm = shelter && person ? (Math.hypot(shelter.x - person.x, shelter.y - person.y) / 100).toFixed(1) : null;

  if (!person) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <p className="text-lg font-bold">Resident profile not found.</p>
          <Button className="mt-4" onClick={() => { session.logout(); navigate('/login?as=user'); }}>
            Log in again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid min-h-screen">
      <div role="note" className="bg-amber px-3 py-1 text-center text-xs font-bold text-slate-950">
        DEMO RESIDENT PHONE — synthetic messages only
      </div>
      <div className="mx-auto max-w-md px-4 pt-4 pb-16">
        <header className="flex items-center justify-between gap-2">
          <div>
            <p className="text-lg font-bold">Hi, {person.name.split(' ')[0]}</p>
            <p className="flex items-center gap-1 text-sm text-ink-3">
              <MapPin aria-hidden className="size-3.5" /> {zoneById(person.zone).name} · {person.phone}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="sr-only" htmlFor="res-lang">
              Language
            </label>
            <select id="res-lang" value={lang} onChange={(e) => setLang(e.target.value as LanguageCode)} className="min-h-10 rounded-lg border border-line bg-panel-2 px-2 text-sm font-bold">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                stopSiren();
                session.logout();
                navigate('/login');
              }}
              aria-label="Log out"
              className="grid size-10 place-items-center rounded-lg border border-line text-ink-2 hover:text-ink"
            >
              <LogOut aria-hidden className="size-4" />
            </button>
          </div>
        </header>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            size="sm"
            icon={Bell}
            onClick={() => {
              unlockAudio();
              if ('Notification' in window) void Notification.requestPermission();
            }}
          >
            Enable alerts
          </Button>
          <Button
            size="sm"
            icon={BellRing}
            onClick={() => {
              unlockAudio();
              startSiren();
              setTimeout(stopSiren, 1500);
            }}
          >
            Test alarm
          </Button>
        </div>

        {/* Status card */}
        <section className={cx('mt-4 rounded-2xl border p-4', latest?.forMe && !latest.response ? 'border-crit bg-crit/10' : 'border-line bg-panel')}>
          {latest ? (
            <>
              <p className={cx('text-xs font-bold uppercase', latest.kind === 'sos' ? 'text-crit' : 'text-warn')}>
                {latest.kind === 'sos' ? 'SOS message' : `${latest.severity} · ${HAZARD_LABEL[latest.hazard]}`} · {clock(latest.at)}
              </p>
              <p className="mt-2 text-lg leading-snug font-bold" lang={lang}>
                {latest.text[lang]}
              </p>
              {latest.response ? (
                <p className={cx('mt-3 flex items-center gap-2 font-bold', latest.response === 'safe' ? 'text-ok' : 'text-crit')}>
                  {latest.response === 'safe' ? <CircleCheck aria-hidden className="size-5" /> : <HandHelping aria-hidden className="size-5" />}
                  {latest.response === 'safe' ? 'You told the control room you are safe.' : 'Help requested — responders have been notified (simulated).'}
                </p>
              ) : latest.forMe ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="success" icon={CircleCheck} onClick={() => respond(latest, true)}>
                    I am safe
                  </Button>
                  <Button variant="danger" icon={HandHelping} onClick={() => respond(latest, false)}>
                    I need help
                  </Button>
                </div>
              ) : (
                <p className="mt-2 text-sm text-ink-3">This message was for other zones — no action needed in your area.</p>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-ink-2">
              <CircleCheck aria-hidden className="size-5 text-ok" /> No active alerts. Keep this screen open — an alarm will ring if the control room sends an SOS.
            </p>
          )}
        </section>

        {/* My area */}
        <section className="mt-4 rounded-2xl border border-line bg-panel p-4">
          <h2 className="flex items-center gap-2 text-base">
            <MapPin aria-hidden className="size-5 text-ink-3" /> My area
          </h2>
          <p className="mt-1 text-sm">
            Risk in {zoneById(person.zone).name}: <b className={risk >= 3 ? 'text-crit' : 'text-ink'}>{RISK_LABEL[risk]}</b> ({HAZARD_LABEL[hazard]})
          </p>
          <div className="mt-3">
            <DisasterMap hazard={hazard} layers={{ hazard: true, relief: true, routes: true, people: false }} highlight={{ x: person.x, y: person.y }} />
          </div>
          {shelter && (
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-panel-2 p-3 text-sm">
              <House aria-hidden className="mt-0.5 size-4 shrink-0 text-ok" />
              <span>
                Nearest safe shelter: <b>{shelter.name}</b> · about {distanceKm} km · {shelter.facilities.join(', ')}
              </span>
            </p>
          )}
        </section>

        <PrecautionsCard hazard={hazard} compact className="mt-4" />

        {/* Contacts */}
        <section className="mt-4 rounded-2xl border border-line bg-panel p-4">
          <h2 className="flex items-center gap-2 text-base">
            <Phone aria-hidden className="size-5 text-ink-3" /> Emergency contacts
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2">
            {EMERGENCY_CONTACTS.filter((c) => c.real).slice(0, 6).map((c) => (
              <li key={c.number}>
                <a href={`tel:${c.number}`} className="flex min-h-14 flex-col justify-center rounded-lg border border-line bg-panel-2 px-3 hover:border-ink/40">
                  <span className="text-lg font-bold">{c.number}</span>
                  <span className="text-xs text-ink-3">{c.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Inbox */}
        <section className="mt-4 rounded-2xl border border-line bg-panel p-4">
          <h2 className="flex items-center gap-2 text-base">
            <Inbox aria-hidden className="size-5 text-ink-3" /> Messages
          </h2>
          {inbox.length === 0 ? (
            <p className="mt-2 text-sm text-ink-3">No messages yet.</p>
          ) : (
            <ul className="mt-2 space-y-2">
              {inbox.map((m) => (
                <li key={m.id} className="rounded-lg bg-panel-2 p-3 text-sm">
                  <p className="text-xs font-bold text-ink-3">
                    {m.kind === 'sos' ? 'SOS' : m.alertId} · {clock(m.at)} {m.response && `· replied: ${m.response === 'safe' ? 'safe' : 'need help'}`}
                  </p>
                  <p className="mt-1" lang={lang}>
                    {m.text[lang]}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-3">Language: {languageInfo(lang).name}. Messages are stored on this phone and stay readable offline.</p>
        </section>
      </div>

      {/* Full-screen SOS alarm */}
      <AnimatePresence>
        {ringing && (
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sos-alarm-title"
            aria-describedby="sos-alarm-text"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-[#3a0d08]/95 p-4"
          >
            <motion.div aria-hidden className="absolute inset-0 bg-crit" animate={{ opacity: [0.05, 0.35, 0.05] }} transition={{ repeat: Infinity, duration: 1 }} />
            <div className="relative w-full max-w-md rounded-2xl border-2 border-white/80 bg-[#1a0d0b] p-6 text-center shadow-2xl">
              <motion.span className="mx-auto grid size-20 place-items-center rounded-full bg-crit text-white" animate={{ scale: [1, 1.12, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                <Siren aria-hidden className="size-10" />
              </motion.span>
              <p id="sos-alarm-title" className="mt-4 text-3xl font-bold text-white">
                {ringing.kind === 'sos' ? 'SOS ALERT' : 'EMERGENCY ALERT'}
              </p>
              <p className="mt-1 text-sm font-bold text-red-200">
                {ringing.severity} · {HAZARD_LABEL[ringing.hazard]} · from the control room (demo)
              </p>
              <p id="sos-alarm-text" className="mt-4 text-xl leading-snug font-bold text-white" lang={lang}>
                {ringing.text[lang]}
              </p>
              <div className="mt-6 grid gap-2">
                <Button size="lg" variant="success" icon={CircleCheck} onClick={() => respond(ringing, true)}>
                  I am safe
                </Button>
                <Button size="lg" variant="danger" icon={HandHelping} onClick={() => respond(ringing, false)} className="border-2 border-white">
                  I need help
                </Button>
                <Button
                  size="lg"
                  icon={muted ? Volume2 : VolumeX}
                  onClick={() => {
                    if (muted) startSiren();
                    else stopSiren();
                    setMuted(!muted);
                  }}
                >
                  {muted ? 'Turn alarm back on' : 'Silence alarm'}
                </Button>
              </div>
              <p className="mt-4 text-xs text-red-200/80">Simulated SOS — synthetic demo, not a real emergency.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
