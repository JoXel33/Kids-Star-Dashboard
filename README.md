# DashWithClaude — Kids Star Dashboard

A single-page browser dashboard for primary-school children. They plan and journal their day
on an hourly agenda, earn one daily star, accumulate a star wallet, and spend stars on a short
wish list of rewards. Data syncs across devices via a small backend.

Built with the [Spec Kit](https://github.com/github/spec-kit) workflow. The complete spec,
clarifications, plan, design docs, and tasks live in
[`specs/001-kids-star-dashboard/`](specs/001-kids-star-dashboard/).

## Stack

- **Frontend**: Vanilla HTML / CSS / JS (no framework, no build step)
- **Backend**: Node.js 20+ with Express; SQLite via the built-in `node:sqlite` module
- **Tests**: `node:test` + Supertest (backend); Playwright (browser E2E)
- One Express process serves both `/api` and the static frontend (same origin — no CORS).

## Quickstart

```bash
cd backend
npm install
cp .env.example .env       # then edit SERVER_SECRET to a long random string
npm run init-db            # create the SQLite database
npm start                  # listens on http://localhost:3000
```

Open `http://localhost:3000`. On first visit, complete the setup screen: name + access code +
the recovery question ("What is the name of your school?"). On another device or browser,
choose **I have a code** to load the same data.

## Tests

```bash
cd backend
npm test                   # backend contract + integration + unit tests (node:test)
npx playwright install chromium    # one-time browser download (≈110 MB)
npm run test:e2e           # Playwright (auto-starts the server)
```

## Project layout

| Path | Purpose |
|------|---------|
| [`backend/src/`](backend/src/) | Express app, services, routes, db, lib |
| [`backend/tests/`](backend/tests/) | Contract / integration / unit / e2e tests |
| [`frontend/`](frontend/) | Single-page HTML / CSS / JS dashboard |
| [`specs/001-kids-star-dashboard/`](specs/001-kids-star-dashboard/) | Spec, plan, design docs, tasks |
| [`.specify/`](.specify/) | Spec Kit configuration and templates |

## Where the data lives

SQLite file at `backend/data/dashboard.sqlite` (auto-created on first run, gitignored). E2E
tests use a separate `dashboard.e2e.sqlite`. See
[`specs/001-kids-star-dashboard/data-model.md`](specs/001-kids-star-dashboard/data-model.md)
for the schema.

Access codes and recovery answers are stored as HMAC-SHA256 hashes (Constitution Principle V —
Children's Data Protection). The frontend includes a "Delete my data" control (settings gear
in the top-right) that calls `DELETE /api/children/me` and cascades to every owned record.

## Smoke-test checklist

See [`specs/001-kids-star-dashboard/quickstart.md`](specs/001-kids-star-dashboard/quickstart.md)
for the manual smoke-test checklist (set up → agenda → date switch → star → wallet → rewards →
cross-device → layout).
