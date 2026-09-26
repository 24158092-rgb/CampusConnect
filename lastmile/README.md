# LASTMILE

**Making Emergency Warnings Understandable, Accessible and Reachable.**

> ⚠️ **SYNTHETIC DEMO DATA — NOT A REAL EMERGENCY ALERT.** LASTMILE is a hackathon demonstration. Every alert, agency, place, recipient and translation is synthetic. It does not connect to any government system, emergency network or SMS gateway, and it sends no messages.

## Problem statement — "Making Emergency Warnings Reach the Last Mile"

Emergency warnings only help when people can receive, understand and act on them. Official alerts often use technical language, exist in one language, depend on internet access, and are hard to follow for people with limited literacy, older adults, people with disabilities, or people unfamiliar with local communication systems. The challenge is to make alerts clearer, more accessible and easier to distribute when communication is limited, **without changing their meaning or urgency**.

## Solution overview

LASTMILE is an emergency-communication command center that takes one official alert through a single connected pipeline:

```
SOURCE SYSTEMS → OFFICIAL ALERT → PLAIN LANGUAGE → TRANSLATION → VISUAL VERSION → SIMULATED DELIVERY → ACKNOWLEDGEMENT
   (Source)        (immutable)    (Clarity          (Language      (Visual           (Delivery            (Receipt
                                   Processor)         Bank)          Studio)           Simulator)           Tracker)
```

Every derived version keeps a link to the untouched official source and is re-checked for the core facts: hazard, severity, area, start/end time, recommended action and urgency.

## Key features

| Area | What it does |
|---|---|
| **Source Systems** | 5 synthetic sources; choose Flood, Cyclone, Extreme Heat or Heavy Rain warnings (4 fully populated scenarios). |
| **Official Alert** | Immutable "OFFICIAL SOURCE CONTENT" card with structured fields, entity highlighting and a *View Original* dialog. |
| **Clarity Processor** | Side-by-side original ↔ plain language, highlighted entities, a **Meaning Preservation Check** and a validator test mode that deliberately drops a fact so you can watch ⚠ CONTENT VALIDATION REQUIRED appear. |
| **Target User Selector** | General public, low-literacy, older adult, visual and hearing accessibility, community volunteer. Each gets its own preview. |
| **Language Bank** | English, Hindi (हिन्दी), Odia (ଓଡ଼ିଆ) and Bengali (বাংলা). Multi-select, side-by-side compare, language coverage metric, and a simulated translation-engine outage with retry. |
| **Visual Studio** | Standard, low-literacy, icon and large-text versions; 🔊 voice playback (browser SpeechSynthesis); PNG export, copy and print. |
| **Community notes** | Pink, dashed, labelled "COMMUNITY-GENERATED INFORMATION — NOT PART OF THE OFFICIAL ALERT". They are never merged into official content. |
| **Delivery Simulator** | Channels: Normal Internet, Low Bandwidth, SMS, Offline Relay and Community Relay. Network-quality slider (100/60/30/10 %) drives latency, packet loss, retries and queues. Animated packets, relay network with offline nodes, fallback chain, demo channel recommendations, SMS phone preview (character count, GSM-7/UCS-2 encoding, segments). |
| **Receipt Tracker** | Live table (cards on mobile) filterable by status, language, format, mode and group. Recipients can answer "I received this alert", "I understand what to do" or "I need help". Delivered/Acknowledged/Needs-help/Pending stats and CSV export. |
| **Lineage & validation** | Message lineage (version ID, timestamp, content type, source, status), locked Core Emergency Facts and a validation matrix for every version. |
| **Analytics** | 7 KPIs and 5 Recharts charts (status distribution, acknowledgement over time, delivery by mode, language coverage, relay health), each with a table view. |
| **Demo modes** | **Run Complete Emergency Demo** (10 steps) and **Judge Demo** (15 steps), with pause, resume, restart, next and skip-to-step. |
| **Other** | Alert history (view, replay, duplicate, start demo), **+ Create Demo Alert**, activity/audit log, system status panel and toasts. |

## Architecture

```
src/
  types/        Strict TypeScript data model (EmergencyAlert, AlertTransformation, DeliveryRecord, RelayNode…)
  data/         Synthetic alerts, phrase bank/translations, sources, personas, recipients, relay nodes, stages, demo scripts
  utils/        content (plain/SMS/visual generation), validation (deterministic fact checks), channel (network model,
                recommendation, fallback), random (seeded PRNG), export (CSV/PNG/print/copy), speech
  store/        Zustand store persisted to localStorage + toast store
  hooks/        usePipeline (stage states), useSimulationLoop (tick driver)
  components/   Layout, ui primitives, badges, alert, pipeline, network, visual, tracking, lineage, controls, CreateAlertDialog
  pages/        Dashboard, Alerts, Official, Pipeline, Clarity, Language, Visual, Delivery, Receipts, Analytics
  styles/       Tailwind v4 theme tokens (standard + high-contrast)
```

- **State:** a single Zustand store with persistence. Transformations are upserted per *(alert, type, language)* and carry a `parentId`, which gives the lineage.
- **Simulation:** a deterministic tick engine (seeded mulberry32 PRNG) advances each delivery record through `QUEUED → IN_TRANSIT → DELIVERED → ACKNOWLEDGED/NEEDS_HELP`, with `FAILED → RETRYING` and fallback transitions. Network quality sets latency, loss and throughput. Offline relay nodes hold queues and forward them when they come back online.
- **Validation:** structured official fields map to expected tokens per language, and the engine checks that those tokens appear in each version. It is purely rule-based.

## Tech stack

React 19 · TypeScript (strict) · Vite · Tailwind CSS v4 · Framer Motion · Recharts · Lucide React · React Router (hash routing) · Zustand · localStorage · Web SpeechSynthesis. No paid APIs, no API keys and no backend.

## How to run

```bash
cd lastmile
npm install
npm run dev      # http://localhost:5173
npm run build    # type-checks and builds to dist/
npm run preview  # serve the production build
```

## Demo workflow (2–3 minutes)

1. **Dashboard:** the hero, metrics and the clickable pipeline. Click **JUDGE DEMO** in the header.
2. The Judge Demo runs automatically; press **Pause** at any point to talk.
   - Official flood alert with its technical wording highlighted.
   - Structured validation, then the Clarity Processor showing **Meaning Integrity: VERIFIED**.
   - Hindi and Odia versions, then the low-literacy visual version (try 🔊).
   - Network drops to 20 %, then an internet and cellular outage. The **Fallback Strategy** moves recipients to the community relay. Relay B comes back online and forwards its queue.
   - Acknowledgements arrive, including one "I need help". Then analytics, lineage and validation.
   - The finale: *"ONE ALERT. MULTIPLE FORMATS. MULTIPLE LANGUAGES. MULTIPLE CHANNELS. ONE SOURCE OF TRUTH."*
3. Optional live extras:
   - **Alerts → + Create Demo Alert** builds the whole pipeline for your own synthetic alert.
   - **Clarity → inject an omission** shows the validator catching a missing fact.
   - **Accessibility → High Contrast / Extra Large**.

## What is simulated

| Real-world function | In LASTMILE |
|---|---|
| Official alert feeds | Hard-coded synthetic scenarios and user-created synthetic alerts |
| Plain-language rewriting | Deterministic templates filled from the structured fields. No AI model, no invented facts |
| Translation | Pre-authored synthetic phrase bank (not certified). Free text in user-created alerts stays in the official wording and is flagged "partial" |
| Meaning check | Rule-based token presence check. Not a certified semantic guarantee |
| Internet, SMS, relay delivery | Local tick simulation. **No real messages are sent** |
| Network conditions, outages, node failures | Parameterised simulation with a seeded PRNG |
| Recipients and acknowledgements | 12 synthetic personas; auto-acknowledgement or manual buttons |
| Channel recommendation | Simple demo rules, labelled "DEMO CHANNEL RECOMMENDATION" |

## Accessibility

- Semantic landmarks, a skip link, ARIA labels on custom controls, live regions for the log, toasts and demo narration.
- Full keyboard navigation with visible focus rings; dialogs trap focus and close with Esc.
- Text size (Normal, Large, Extra Large) scales the whole UI. A high-contrast theme is available. Reduced motion follows both the in-app toggle and the OS setting.
- Severity always appears as icon + text + border, never colour alone. Icons always come with text labels. Touch targets are at least 44 px.
- Voice playback uses installed voices. If a language voice is missing, LASTMILE says so and reads the English version rather than misreading the text.
- Each chart has a table view.

## Future scope

- Integration with CAP (Common Alerting Protocol) feeds, with human-in-the-loop review before any real dissemination.
- Professionally reviewed translations for more languages, and sign-language video versions.
- A real offline mesh (Bluetooth or Wi-Fi Direct) and community-radio scripts; a PWA with a service worker.
- An audited approval workflow and role-based access for alert authors, translators and volunteers.
