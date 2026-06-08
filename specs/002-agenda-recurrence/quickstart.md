# Quickstart: Recurring Agenda Items

This feature **piggybacks on feature 001's setup**. If you already have the dashboard
running, you do not need to touch the database, environment, or dependencies.

## What does NOT change

- **Database schema** — no migration; no `npm run init-db` re-run needed.
- **Environment / `.env`** — no new keys.
- **Dependencies** — `backend/package.json` is unchanged (no new npm packages).
- **Run commands** — `npm start`, `npm run dev`, `npm test`, `npm run test:e2e` all
  unchanged.
- **CI workflow** — unchanged.

## Prerequisites

Same as feature 001 (see [../001-kids-star-dashboard/quickstart.md](../001-kids-star-dashboard/quickstart.md)):

- **Node.js 22 LTS** or newer (`node --version`) — required for `node:sqlite`.
- A modern desktop browser.
- Git.

If feature 001 has been run successfully on this machine, you are already set up.

## Run the app

```powershell
cd backend
npm start
```

Then open `http://localhost:3000` and log in as you would normally. Add an activity in
any non-elapsed hour-block, then click the **↻** icon at the right of that row to open
the **Repeat** popover.

## Run the tests

Backend (now includes new recurrence contract + integration tests):

```powershell
cd backend
npm test
```

E2E (now includes new recurrence specs):

```powershell
cd backend
npm run test:e2e
```

## Smoke-test checklist (manual)

After `npm start`:

1. **Affordance gating** — confirm the ↻ icon appears only on filled, non-elapsed rows.
   Empty rows: no icon. Elapsed rows: no icon. Past-date rows: no icon.
2. **Daily recurrence (US1)** — on a non-elapsed row of today's agenda, enter "Reading",
   click ↻, pick **Every day**, enter an **Until** date a few days from today, confirm.
   Wand spinner appears. Popover closes. Navigate the calendar to each target date —
   "Reading" should be at the same hour.
3. **Weekly recurrence (US2)** — on today's row, click ↻; confirm the second option
   reads **"Every &lt;today's day-of-week&gt;"**. Pick it, enter an **Until** 2–3 weeks
   out, confirm. Only the matching weekday dates should be populated.
4. **Validation (US3)** —
   - Click ↻ and focus **Until** — confirm the tooltip `YYYY-MM-DD` is visible.
   - Try `2026-02-30`, the source date, a past date, and a date more than 90 days from
     today — each should be rejected with a kid-friendly message, no entries created.
5. **Atomicity** — best confirmed by the integration test; no easy manual repro.
6. **Modality** — while the popover is open, calendar dates, other agenda rows, the star,
   wants, and the logout button MUST all be non-interactive. Click outside → popover
   closes (acts as **Not now**). Press ESC → popover closes (acts as **Not now**).
7. **Double-click Confirm** — click Confirm twice in quick succession → exactly one
   application should land (button is disabled after the first click).

## Common commands

| Command | Purpose |
| --- | --- |
| `npm start` | Run the server (frontend + API) on `PORT` |
| `npm test` | Run backend contract / integration / unit tests, including new recurrence tests |
| `npm run test:e2e` | Run Playwright end-to-end tests, including new `us4-recurrence-*.spec.js` |
| `npm run dev` | Run the server with auto-reload (unchanged) |

## Files added or modified by this feature

See the `Project Structure` section of [plan.md](plan.md) for the file-level deltas.
