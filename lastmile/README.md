# LastMile — Emergency Warnings that Reach the Last Mile

> **SYNTHETIC DEMO DATA — NOT A REAL EMERGENCY SYSTEM.** Every alert, place, resident and message is synthetic. Nothing is sent to real phones, SMS gateways or government systems. The national helpline numbers on the Safety page are real Indian emergency numbers.

LastMile takes one official emergency alert and makes it **understandable** (plain language, translations, icons, voice), **reachable** (broadcast to every resident over internet, SMS or community relay — even with poor or no network) and **accountable** (who received it, who is safe, who needs help) — without changing its meaning or urgency.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/ (with offline support)
npm run preview  # serve the production build
```

## Log in (demo)

| Role | How | What you can do |
|---|---|---|
| **Admin / control room** | `admin` / `1234` (pre-filled) | Issue and process alerts, broadcast to all residents, send SOS, monitor responses, map, dataset |
| **User / resident** | Pick your zone and language | Phone-style resident app: receives alerts, **rings an SOS alarm**, replies "I am safe" / "I need help", sees the nearest shelter, actions and contacts |

**SOS alarm demo (two tabs):** log in as Admin in one tab. From the Command Center, click **Open a resident phone (new tab)** and log in as User there. Back in the Admin tab, press **SOS → Send**. The resident tab plays a siren, vibrates (on phones) and shows a full-screen SOS notification in the resident's language. Their reply appears instantly on the admin side. Tabs talk through the browser's `BroadcastChannel`, so there's no server.

## Sections

1. **Command Center**
   - The active disaster, with one-click **Send SOS to all**.
   - The official alert and its simplified/translated versions, shown in **separate sections**.
   - A live map, immediate actions, emergency contacts and an activity log.
2. **Alerts** (tabs)
   - **Official alert**: unchanged source text, plus recommended precautions labelled as separate guidance.
   - **Simplified**: plain language with a meaning check.
   - **Translations**: Hindi, Odia and Bengali.
   - **Visual & voice**: icon and low-literacy cards, spoken playback, PNG export and print.
   - **Integrity check**: lineage and fact validation.
   - **Alert library**: sources, history and creating your own alert.
3. **Live Map**
   - An offline schematic district map showing disaster risk zones for each hazard.
   - **Relief zones**: shelters, medical, food, water, assembly points and a helipad, with live shelter occupancy.
   - Evacuation routes, and every resident shown by message status.
4. **Broadcast & SOS**
   - Broadcast the alert or an SOS to **1,000–10,000 residents**, each in their own language.
   - **Low-bandwidth support**: the network slider changes latency, loss, format (rich / compressed / SMS-only) and throughput.
   - An outage fallback to the community relay, and an offline outbox.
   - A pop-up preview of what residents see, plus the tracked 12-recipient relay network.
5. **Responses**
   - Everyone's status, a "need help" dispatch list, reach by zone, search and CSV export.
   - Also: the tracked recipients and analytics charts.
6. **Safety & Contacts**
   - Immediate actions plus before/during/after precautions for **every alert type**.
   - Emergency helplines (tap to call) and a saved emergency-kit checklist.
7. **Dataset**
   - Generate a temporary synthetic population (1,000 / 1,200 / 2,500 / 5,000 or custom), with breakdowns and a searchable table.
   - Export as CSV or JSON.

**Judge Demo** (sidebar) plays the whole story automatically:
- official alert → simplified → translated → visual → map;
- then broadcast at 20% network → outage fallback → relay network;
- then SOS to everyone → responses → shelters filling → integrity.

Pause, next, restart and skip-to-step are available throughout.

## Offline

The production build registers a service worker (`public/sw.js`) that caches the app. After one visit, it reloads and works with no network. The map is drawn locally, and fonts are system fonts (Arial), so nothing needs the internet. The header's **Online / Offline** button simulates the operator losing connectivity: messages then queue in an outbox and the community relay keeps working.

## Tech

React 19 · TypeScript · Vite · Tailwind CSS · Zustand (saved in localStorage; the login is per-tab in sessionStorage) · Framer Motion · Recharts · Lucide icons · Web Audio (siren), SpeechSynthesis (voice), Notification and BroadcastChannel APIs. No backend, no API keys.

## What is simulated

- Alerts, translations and residents are synthetic.
- Plain language comes from fixed templates, not AI.
- The fact check is rule-based.
- Delivery, network quality, outages, relays and responses are a deterministic local simulation.
- Logins are demo-only.
