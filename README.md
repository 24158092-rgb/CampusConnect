# Campus Connect

Campus Connect is the platform where student clubs and departments post
campus events, and where students discover and register for them —
replacing scattered WhatsApp forwards and half-updated noticeboards.

This repo is a **hackathon starter**. OTI (Office of Technical
Initiatives) has already built the app shell, styling, seed data, and
auth skeleton. Participants build the actual event registration logic
on top of it.

## What OTI has already built

- A styled Next.js app with Home, Event Listing, Event Detail, My
  Registrations, and Organizer Dashboard pages.
- An in-memory seed store of 15 events across 6 categories, including
  some full events and some past events.
- A simple auth skeleton — switch between a seeded student and
  organizer account from the navbar dropdown. There's no real login
  form; that's intentional.
- A few stubbed API routes returning hardcoded/partial data.
- 3 starter tests (2 passing, 1 intentionally failing until you
  implement search).

None of the actual registration, cancellation, or event-management
logic works yet — every button that needs it is disabled with a
tooltip explaining which task it belongs to.

## Getting started

### 1. Fork the repository

Click **Fork** on GitHub to create your own copy under your account.

### 2. Clone your fork

```bash
git clone https://github.com/<your-username>/campus-connect.git
cd campus-connect
```

### 3. Install dependencies

```bash
npm install
```

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

No real values are needed to run the starter — everything runs on seed data.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Run the tests

```bash
npm run test
```

You should see **2 passing, 1 failing**. The failing test is meant to
fail until you implement one of the Task 1 features — read the test
file to see what it expects.

Setup end-to-end should take well under 10 minutes.

## Project structure

app/ → pages and API routes
components/ → shared UI components
data/ → in-memory seed data and helper functions
tests/ → Vitest tests

Explore the folders yourself to see how things are organized. The
codebase is small — reading through `data/`, `components/`, and the
pages under `app/` before you start will save you time.

## What you're building

OTI has intentionally left gaps in the app: some functions are stubs,
some buttons are disabled, some pages only read data instead of
writing it. Your job is to find these (look for comments starting with
`PARTICIPANT TASK`) and implement them.

You generally shouldn't need to change the shape of `CampusEvent` or
`Registration` in `data/events.ts` / `data/registrations.ts` — you're
mostly adding logic around the existing data, not redesigning it.

> **Note:** seeded events belong to organizer ids `org-1` through
> `org-4`, but only one organizer user exists in the seed data. Keep
> that in mind once you get to Organizer Management.

## Your tasks

### Task 1 — Event Listing (15 points)

- Fetch and display all events from the store — 2
- Hide past events — 2
- Display name, date, venue, category, available seats — 2
- Search by name, partial and case-insensitive — 3
- Filter by category — 3
- Search + filter together — 2
- Event detail page with graceful empty state — 1

### Task 2 — Registration (25 points)

- Student registration: form + API + store write — 5
- Prevent duplicate registration — 5
- Prevent registration when event is full — 5
- Decrease seats after registration — 4
- Success/error feedback — 3
- Block past/cancelled event registration — 2
- Login required — 1

### Task 3 — My Registrations (17 points)

- List logged-in student's registrations — 4
- Show date, venue, status — 3
- Upcoming vs past grouping/badge — 2
- Cancel registration button + API — 4
- Increase seats after cancellation — 3
- Correctly mark/remove cancelled registrations — 1

### Task 4 — Organizer Management (23 points)

- Create event: form + API + store write — 5
- Edit event — 4
- Cancel/delete event — 3
- Validate name, future date, venue, capacity > 0 — 4
- Organizer-only pages hidden from students — 2
- Organizer-only API rejects non-organizers — 4
- Cancelled event/registrations hidden from students — 1

### Task 5 — Debugging (15 points)

- Fix seat count — 4
- Fix duplicate registrations — 4
- Fix cancelled registrations appearing — 4
- Fix unauthorized organizer API access — 3

### Stretch (5 points)

- Sort events by date — 2
- Sort by registration popularity — 3

**Total: 100 points**

## How to approach it

1. Run the app and click around as both a student and an organizer
   (switch accounts from the top-right dropdown).
2. Run `npm run test` and figure out why the failing test fails —
   that tells you what your first function needs to do.
3. Search the codebase for comments starting with `PARTICIPANT TASK`
   — each one marks a gap you need to fill, but figuring out exactly
   which files and routes to touch is part of the challenge.
4. Work through the tasks in whatever order makes sense to you —
   Task 1 is the easiest starting point, but nothing forces that order.
5. Keep using the existing seed data arrays as your "database" — don't
   create a second data store.

## Performance

The app already loads its fonts through Next.js's built-in font
optimization rather than a render-blocking stylesheet import, so pages
load fast with no layout shift out of the box. Keep this in mind if
you add new fonts or large images later — prefer `next/font` and
compressed assets over raw `<link>` tags where you can.

## Notes

- No real database or auth is required — everything is in-memory,
  which resets on server restart. That's expected for this challenge.
- Keep the existing visual style (fonts, colors, card layout) unless a
  task specifically asks you to change it.
