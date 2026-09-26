# Campus Connect

Campus Connect is the platform where student clubs and departments post campus events, and where students discover and register for them, replacing scattered WhatsApp forwards and half-updated noticeboards.

## Overview

Campus Connect is a hackathon starter project built by the Office of Technical Initiatives. The app shell, styling, seed data, and auth skeleton are already in place. Participants build the actual event registration logic on top of it.

The app supports two roles:

- **Students** discover events, register for them, and manage their registrations.
- **Organizers** create and manage events.

## What Has Already Been Built

The starter project already includes the following functionality. Participants should build the remaining functionality described in the tasks below.

- **Pages:** a styled Next.js app with Home, Event Listing, Event Detail, My Registrations, and Organizer Dashboard pages
- **Seed data:** an in-memory seed store of 15 events across 6 categories, including some full events and some past events
- **Auth skeleton:** switch between a seeded student and organizer account from the navbar dropdown. There is no real login form; that is intentional.
- **Tests:** 3 starter tests (2 passing, 1 intentionally failing until you implement search)
- **Styling:** the existing visual style (fonts, colors, card layout)
- **Font optimization:** fonts are loaded through Next.js's built-in font optimization

## Features

### Existing Features

- Home, Event Listing, Event Detail, My Registrations, and Organizer Dashboard pages
- Seeded events, including full and past events
- Switching between a seeded student and organizer account from the navbar dropdown

### Features to Be Implemented

- Event listing with search, filtering, and a graceful empty state
- Student registration with duplicate, capacity, past/cancelled, and login checks
- My Registrations with upcoming/past grouping and cancellation
- Organizer event management (create, edit, cancel/delete) with validation and access control
- Fixes for the known bugs listed under [Debugging Tasks](#debugging-tasks)

None of the registration, cancellation, or event-management logic works yet. Every button that needs it is disabled with a tooltip explaining which task it belongs to.

## Tech Stack

- **Language:** TypeScript (with CSS and a small amount of JavaScript)
- **Framework:** Next.js
- **Styling:** CSS
- **Data storage:** In-memory seed data (no real database)
- **Testing:** Vitest
- **Package manager:** npm
- **Deployment:** Vercel

## Getting Started

Setup end-to-end should take well under 10 minutes.

### 1. Fork the Repository

Click **Fork** on GitHub to create your own copy under your account.

### 2. Clone the Repository

```bash
git clone https://github.com/<your-username>/campus-connect.git
cd campus-connect
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

```bash
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

### 5. Run Tests

```bash
npm run test
```

All tests should pass. `tests/store.test.ts` covers search and filtering, registration, cancellation, and organizer management.

## Project Structure

```text
CampusConnect/
├── app/
│   ├── events/
│   │   └── [id]/page.tsx     # Event detail page + registration
│   ├── organizer/
│   │   ├── page.tsx          # Organizer dashboard
│   │   └── events/           # New / edit event forms
│   ├── registrations/page.tsx # My Registrations
│   ├── actions.ts            # Server actions (login switch, register, cancel, manage events)
│   ├── globals.css           # Global styles
│   ├── layout.tsx            # App layout
│   └── page.tsx              # Home page
├── components/               # Shared UI components
├── data/
│   ├── auth.ts               # Seeded auth accounts
│   ├── events.ts             # In-memory event seed data and helpers
│   ├── registrations.ts      # In-memory registration data and helpers
│   └── store.ts              # Registration and event-management rules
├── lib/session.ts            # Reads the signed-in account from a cookie
├── tests/                    # Vitest tests
├── next.config.js
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

- `app/` contains the pages.
- `components/` contains shared UI components.
- `data/` contains the in-memory seed data and helper functions.
- `tests/` contains the Vitest tests.

The codebase is small. Reading through `data/`, `components/`, and the pages under `app/` before you start will save you time.

## What Participants Need to Build

The starter project intentionally leaves gaps: some functions are stubs, some buttons are disabled, and some pages only read data instead of writing it.

To find the unfinished areas:

- Search the codebase for comments starting with `PARTICIPANT TASK`. Each one marks a gap you need to fill. Figuring out exactly which files and routes to touch is part of the challenge.
- Look for buttons that are disabled with a tooltip naming the task they belong to.
- Run `npm run test` and check the failing test.

## Participant Tasks

### Task 1 — Event Listing

- Fetch and display all events from the store
- Hide past events
- Display name, date, venue, category, and available seats
- Search by name (partial and case-insensitive)
- Filter by category
- Make search and filter work together
- Provide an event detail page with a graceful empty state

### Task 2 — Registration

- Provide student registration: form and store write
- Prevent duplicate registration
- Prevent registration when the event is full
- Decrease seats after registration
- Show success and error feedback
- Block registration for past or cancelled events
- Require login

### Task 3 — My Registrations

- List the logged-in student's registrations
- Show date, venue, and status
- Group registrations as upcoming vs. past, or show a badge
- Provide a cancel registration button
- Increase seats after cancellation
- Correctly mark or remove cancelled registrations

### Task 4 — Organizer Management

- Create an event: form and store write
- Edit an event
- Cancel or delete an event
- Validate name, future date, venue, and capacity
- Hide organizer-only pages from students
- Hide cancelled events and their registrations from students

## Debugging Tasks

### Task 5 — Debugging

Find and fix these problems:

- Seat count
- Duplicate registrations
- Cancelled registrations appearing

## Stretch / Optional Tasks

These tasks are optional and separate from the required tasks above.

- Sort events by date
- Sort events by registration popularity

## Expected Behavior

- **Event listing:** only upcoming events are shown, with name, date, venue, category, and available seats. Search is partial and case-insensitive, and it works together with the category filter. The event detail page handles missing events gracefully.
- **Registration:** students must be logged in. Duplicate registrations, registrations for full events, and registrations for past or cancelled events are blocked. Available seats decrease after a successful registration, and the student sees success or error feedback.
- **Cancellation:** cancelling a registration increases the available seats. Cancelled registrations are correctly marked or removed.
- **My Registrations:** shows the logged-in student's registrations with date, venue, and status, grouped or badged as upcoming vs. past.
- **Organizer management:** event name, future date, venue, and capacity are validated. Organizer-only pages are hidden from students. Cancelled events and their registrations are hidden from students.

## How to Approach the Project

1. Run the app with `npm run dev` and click around as both a student and an organizer, switching accounts from the top-right dropdown.
2. Run `npm run test` and work out why the failing test fails. That tells you what your first function needs to do.
3. Search the codebase for comments starting with `PARTICIPANT TASK`.
4. Read through `data/`, `components/`, and the pages under `app/` to understand how the code is organized.
5. Work through the tasks in whatever order makes sense to you. Task 1 is the easiest starting point, but nothing forces that order.
6. Test each feature as you build it, and verify edge cases such as full events, past events, duplicate registrations, and cancelled events.

## Important Notes and Constraints

- You generally shouldn't need to change the shape of `CampusEvent` or `Registration` in `data/events.ts` and `data/registrations.ts`. You are mostly adding logic around the existing data, not redesigning it.
- Keep using the existing seed data arrays as your "database". Don't create a second data store.
- Seeded events belong to organizer ids `org-1` through `org-4`, but only one organizer user exists in the seed data. Keep this in mind when you get to Organizer Management.
- No real database or auth is required. Everything is in-memory and resets on server restart. That is expected for this challenge.
- Keep the existing visual style (fonts, colors, card layout) unless a task specifically asks you to change it.

## Performance

The app already loads its fonts through Next.js's built-in font optimization rather than a render-blocking stylesheet import, so pages load fast with no layout shift out of the box. If you add new fonts or large images later, prefer `next/font` and compressed assets over raw `<link>` tags where you can.

## Implementation Notes

- **Where the rules live:** `data/store.ts` holds every rule (login and role checks, duplicates, capacity, past and cancelled events, ownership, validation, seat counts). Server actions in `app/actions.ts` only call into it.
- **Mock login:** the navbar account picker now has a **Signed out** option. The chosen account is stored in a cookie so server pages and actions can see it. Organizer accounts for `org-2` to `org-4` were added so every seeded event has someone who can manage it. Organizers can only edit, cancel, or delete their own events.
- **One shared store:** Next.js loads server actions and server components as separate module copies. The seed arrays are pinned to `globalThis` so both copies read and write the same arrays.
- **Cancellation:** cancelling a registration marks it `cancelled`. It is not deleted. Cancelling an event also cancels its registrations and hides the event and those registrations from students. Deleting an event removes the event and its registrations.
- **Bugs fixed (Task 5):**
  - **Seat count:** seats only change when a registration's status really changes. They stay between 0 and capacity. Editing capacity keeps the seats already taken.
  - **Duplicate registrations:** the duplicate check runs before any write. Re-registering after a cancellation reactivates the old record instead of adding a second one.
  - **Cancelled registrations appearing:** `getRegistrationsForStudent` now leaves cancelled registrations out by default. Registrations for cancelled events are also hidden. The home page no longer counts cancelled events as upcoming.
  - `tests/events.tests.ts` did not match Vitest's `*.test.ts` pattern, so it never ran. It is now `tests/events.test.ts`.
- **Fonts:** the Google Fonts `@import` in `globals.css` blocked rendering. Fonts now load through `next/font` in `app/layout.tsx`, as described under Performance.
- **Stretch goals:** the event listing can sort by soonest date or by popularity (seats taken).

### Registration form, groups, and sign-up

- **Sign-up (`/signup`):** new students enter their name, roll number, year of study, contact number, KIIT email (`@kiit.ac.in`) and personal Gmail. Each roll number, contact number and KIIT email can belong to only one account. A duplicate shows "User already signed in". New accounts appear under **Students** in the account menu at the top right.
- **Registration form:** a student chooses to register as an **individual** or a **group**.
  - A group has 2–4 members. Each member fills in the same six details, and one member is marked as team leader. Every member takes one seat.
  - Group names must be unique for each event, ignoring case. The form checks availability as you type.
  - Nobody can appear twice in one registration or be registered twice for the same event.
  - The account holder must be one of the members. Their details are filled in automatically.
- **My Registrations:** has Upcoming, Past and a **Cancelled** section for registrations the student cancelled. Each cancelled registration has a "Register again" link while the event is still open.
- **Organizer cancellations:**
  - When an organizer cancels (or deletes) an event, every registered student is notified. A banner appears on every page until the student dismisses it.
  - The notice also stays under "Cancelled by the organizer" on My Registrations, and the event page says registration is no longer possible.
  - The organizer dashboard is split into Upcoming, Past and Cancelled sections.
  - The organizer who owns an event sees its registrations, including team members and leaders, on the event page.
- **Duplicate events:** an event can't be created or renamed to the same name (ignoring case and spacing) as an upcoming event from any organizer. The organizer sees a message saying the event is already listed.

## Deployment

- **Platform:** Vercel
- **Live URL:** [campus-connect-omega-nine.vercel.app](https://campus-connect-omega-nine.vercel.app)
- **Environment:** Production

## Resources

- [Live application](https://campus-connect-omega-nine.vercel.app)

## Links

- How to clone and fork this GitHub Repository:
  
  https://drive.google.com/file/d/1NFg9MRCJtUsP_30yPS3K5CgzCLcRbFFb/view?usp=drivesdk
- Directly download zip file:
  
  https://drive.google.com/file/d/1apMUhus-qXZbmAM-AKIRptr5H07NE2jr/view?usp=sharing
