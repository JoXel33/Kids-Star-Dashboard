# Quickstart: Kids Star Dashboard

How to set up, run, and test the dashboard during development.

## Prerequisites

- **Node.js 20 LTS** or newer (`node --version`)
- A modern desktop browser (Chrome, Edge, Firefox, or Safari)
- Git (the repository is already initialised)

## Project layout

```text
backend/    Node.js + Express API; also serves the static frontend
frontend/   Vanilla HTML/CSS/JS single-page dashboard
```

The `backend` process serves both the API (`/api/...`) and the `frontend/` files, so the whole
app runs on one port at one origin.

## First-time setup

```bash
cd backend
npm install
```

Create a `.env` file in `backend/` (copy from `.env.example`):

```text
PORT=3000
SERVER_SECRET=replace-with-a-long-random-string   # used to HMAC access codes
DB_PATH=./data/dashboard.sqlite
```

Initialise the database (creates the SQLite file and tables from `src/db/schema.sql`):

```bash
npm run init-db
```

## Run the app

```bash
cd backend
npm start
```

Then open the dashboard in a browser:

```text
http://localhost:3000
```

On first visit the dashboard shows the **first-use setup**: pick a name, create a simple
access code, and answer the recovery question ("What is the name of your school?"). On any
other device/browser, choose **"I already have a code"** and enter the access code to load the
same data.

## Run the tests

Backend (contract + integration + unit) — uses a temporary SQLite database:

```bash
cd backend
npm test
```

Frontend end-to-end (Playwright drives a real browser against a running server):

```bash
cd backend
npm run test:e2e        # starts a test server, runs frontend/tests/e2e specs
```

## Smoke-test checklist (manual)

After `npm start`, verify the golden paths:

1. **Setup & greeting** — complete first-use setup; the header greets you by name with the
   correct time-of-day phrase and shows today's date.
2. **Agenda** — today is highlighted in the calendar; 4 hour blocks are visible; enter and
   save an activity for an upcoming hour; scroll to other blocks; confirm elapsed blocks are
   read-only and marked.
3. **Date switch** — pick another date; the agenda changes; the Star Wallet and Wants list do
   **not** change.
4. **Star** — toggle today's star on/off (before 21:30); a past date shows its star read-only.
5. **Wallet** — Stars Collected, Stars Spent, and Star Balance display; Balance =
   Collected − Spent.
6. **Rewards** — add a Want (cost 1–5); redeem one when the balance is sufficient and confirm
   it disappears and the balance drops; confirm no redeem option appears when unaffordable;
   confirm no 4th Want can be added.
7. **Cross-device** — open `http://localhost:3000` in a second browser, log in with the same
   access code, and confirm the data matches.
8. **Layout** — at 1366×768 all six sections fit with no full-page scroll.

## Common commands

| Command | Purpose |
|---------|---------|
| `npm start` | Run the server (frontend + API) on `PORT` |
| `npm run init-db` | Create the SQLite database and tables |
| `npm test` | Run backend contract/integration/unit tests |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run dev` | Run the server with auto-reload (if configured) |
