# Implementation Plan: Kids Star Dashboard — Daily Planner & Star Reward System

**Branch**: `001-kids-star-dashboard` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-kids-star-dashboard/spec.md`

## Summary

A single-page browser dashboard that lets one primary-school child plan and journal their day
(hourly agenda 07:00–21:00), earn a daily star, track a star wallet, and spend stars on a
short wish list of rewards. Data syncs across devices via a small backend; the child is
identified by a simple access code, with recovery via the question "What is the name of your
school?".

Technical approach: a vanilla HTML/CSS/JS frontend (no framework, no build step) matching the
provided ocean/princess theme, talking to a minimal Node.js + Express REST API backed by a
file-based SQLite database. A single Express process serves both the static frontend and the
`/api` routes (same origin — no CORS). The browser's local clock is the source of truth for
all date/time decisions (today, elapsed hours, the 21:30 star lock); the backend persists data
and re-validates invariants on every mutating request.

## Technical Context

**Language/Version**: JavaScript — ES2022 modules. Node.js 20 LTS (backend); modern evergreen browsers (frontend).
**Primary Dependencies**: Backend — Express 4, better-sqlite3. Frontend — none (vanilla DOM + Fetch API); Fredoka One + Nunito web fonts.
**Storage**: SQLite (single file) via better-sqlite3.
**Testing**: Backend — Node built-in `node:test` + Supertest for contract/integration tests. Frontend — Playwright for end-to-end browser tests.
**Target Platform**: Desktop browsers (Chrome, Edge, Firefox, Safari) on a standard laptop screen (≥1366×768); backend on Node.js 20 (local or small host).
**Project Type**: Web application (separate frontend + backend folders, served by one Node process).
**Performance Goals**: Calendar date switch updates the agenda within 1 s; all interactions feel instant (<200 ms perceived). Data volumes are tiny (one child ≈ 14 agenda rows/day, ≤3 wants).
**Constraints**: All six sections fit one screen with no full-page scroll (only the agenda hour list scrolls internally); target ≥1366×768. Network required for cross-device sync. The child's local clock is authoritative for all time logic.
**Scale/Scope**: Optimised for individual children; each access code is an isolated dataset. 6 UI sections, 3 user stories, ~13 REST endpoints, 5 database tables.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against the project constitution **v1.0.0** at
`.specify/memory/constitution.md`.

- **I. Test-First Development (NON-NEGOTIABLE)** — **PASS**. `tasks.md` authors contract,
  integration, and E2E tests for each user story before the corresponding implementation
  tasks, and requires the tests to fail first.
- **II. Specification-Driven Workflow** — **PASS**. This feature has `spec.md` (with 5
  resolved clarifications), this plan, `tasks.md`, and design artefacts (`research.md`,
  `data-model.md`, `contracts/`, `quickstart.md`).
- **III. Simplicity & YAGNI** — **PASS**. Vanilla HTML/CSS/JS + minimal Express + SQLite is
  the smallest viable stack; no premature abstractions. Complexity Tracking is empty.
- **IV. Child-First User Experience** — **PASS**. Single-screen layout (FR-033),
  child-friendly ocean/princess theme (FR-034), performance budgets encoded in Success
  Criteria (date switch < 1 s, perceived < 200 ms).
- **V. Children's Data Protection** — **PASS** with one follow-up. Backend implements
  HMAC-hashed credentials, first-name-only PII, no third-party trackers, and the
  `DELETE /api/children/me` endpoint (research.md §10, contracts/rest-api.md, task T014).
  *Follow-up*: `/speckit-analyze` flagged C2 — no frontend control yet wires the deletion
  endpoint; add a polish task before `/speckit-implement` closes.

**Initial gate**: PASS.
**Post-Design re-check**: PASS (no design change has invalidated the post-Phase-1 evaluation;
the C2 gap is a frontend-UX surface to add, not a principle violation).

## Project Structure

### Documentation (this feature)

```text
specs/001-kids-star-dashboard/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output — technology & design decisions
├── data-model.md        # Phase 1 output — entities, schema, validation
├── quickstart.md        # Phase 1 output — setup & run instructions
├── contracts/
│   └── rest-api.md      # Phase 1 output — REST API contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
├── assets/
│   └── theme-and-layout-reference.md   # Extracted ocean/princess theme tokens
└── spec.md              # Feature specification
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── server.js            # Process entry: start HTTP server
│   ├── app.js               # Express app: static frontend + /api routes
│   ├── db/
│   │   ├── index.js         # SQLite connection (better-sqlite3)
│   │   └── schema.sql       # Table definitions
│   ├── middleware/
│   │   └── auth.js          # Validate session token → attach child
│   ├── routes/
│   │   ├── children.js      # First-use setup, profile, recovery
│   │   ├── sessions.js      # Login with access code
│   │   ├── days.js          # Agenda entries + day star
│   │   ├── wallet.js        # Stars Collected / Spent / Balance
│   │   └── wants.js         # Wants CRUD + redeem
│   ├── services/
│   │   ├── childService.js
│   │   ├── agendaService.js
│   │   ├── starService.js
│   │   ├── walletService.js
│   │   └── wantService.js
│   └── lib/
│       ├── hash.js          # HMAC hashing of codes / recovery answers
│       └── time.js          # Client-time parsing & elapsed/lock checks
├── tests/
│   ├── contract/            # One file per endpoint group (Supertest)
│   ├── integration/         # User-story flows
│   └── unit/                # Services, lib helpers
├── data/                    # SQLite file lives here (gitignored)
└── package.json

frontend/
├── index.html               # Single page — all six sections
├── css/
│   └── styles.css           # Ocean/princess theme + one-screen grid layout
├── js/
│   ├── app.js               # Bootstrap, auth gate, render loop
│   ├── api.js               # Fetch wrapper for /api
│   ├── state.js             # In-memory client state
│   ├── time.js              # Local-clock helpers (today, elapsed, 21:30)
│   └── components/
│       ├── auth.js          # First-use setup / login / recovery screens
│       ├── greeting.js      # Section 1
│       ├── calendar.js      # Section 2
│       ├── agenda.js        # Section 3
│       ├── star.js          # Section 4
│       ├── wallet.js        # Section 5
│       └── rewards.js       # Section 6
└── tests/
    └── e2e/                 # Playwright specs (one per user story)
```

**Structure Decision**: Web application with distinct `backend/` and `frontend/` folders. The
cross-device sync clarification (FR-031) requires a backend, so a pure static site is not
viable. A single Express process serves the static `frontend/` assets and the `/api` routes,
keeping everything same-origin (no CORS) and deployable as one unit.

## Complexity Tracking

No constitution gates are defined, and the design introduces no exceptional complexity
requiring justification. The frontend/backend split is the minimum structure that satisfies
the cross-device sync requirement (FR-031); vanilla JS and SQLite were chosen specifically to
keep the moving parts to a minimum.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _None_ | — | — |
