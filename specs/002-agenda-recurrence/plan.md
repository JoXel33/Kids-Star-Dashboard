# Implementation Plan: Recurring Agenda Items

**Branch**: `002-agenda-recurrence` | **Date**: 2026-06-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/002-agenda-recurrence/spec.md`

## Summary

Add a per-item recurrence affordance to the existing agenda. From any agenda row that is
non-empty and not elapsed, the child opens a **Repeat** popover anchored to the row, picks
**Every day** or **Every &lt;day-of-week of the source block&gt;**, enters an **Until** date
(capped at today + 90 days), and confirms. The server fans out a single atomic transaction
that writes (or overwrites) one agenda entry per matching date/hour slot in the range and
leaves the source unchanged. Entries are independent copies — no series identity is
persisted.

Technical approach: zero schema changes (reuse `agenda_entries`), one new authenticated
endpoint (`POST /api/days/{date}/agenda/{hour}/recurrence`), one new frontend popover
component, and a small wand-themed spinner CSS. All voice and behaviour decisions are
already locked in spec.md clarifications Q1–Q4; no new dependencies.

## Technical Context

**Language/Version**: JavaScript — ES2022 modules. Node.js 22 LTS (≥22.5 for `node:sqlite`)
on the backend; modern evergreen browsers (frontend). Inherits feature 001's stack
verbatim.
**Primary Dependencies**: Backend — Express 4 (existing), Node's built-in `node:sqlite`
(existing). Frontend — none (vanilla DOM + Fetch API). **No new runtime dependencies.**
**Storage**: SQLite (single file) via `node:sqlite`. **No schema migration** — the existing
`agenda_entries` table already has the columns and the `UNIQUE (child_id, date, hour)`
constraint we need for the fan-out's upsert.
**Testing**: Backend — Node built-in `node:test` + Supertest for contract/integration tests;
new failure-injection integration test for SC-008 (FR-018 atomicity). Frontend — Playwright
for end-to-end browser tests; one new spec per user story (`us4-recurrence-daily.spec.js`,
`us5-recurrence-weekly.spec.js`, plus a validation case in the existing US3 family).
**Target Platform**: Inherits feature 001 — desktop browsers (Chrome, Edge, Firefox, Safari)
on ≥1366×768; backend on Node.js 22+ (local or small host).
**Project Type**: Web application; extends feature 001's existing structure (no new
top-level folders).
**Performance Goals**: Apply recurrence and have all target dates populated within **2 s**
of confirming (SC-001/002). The fan-out is at most 90 inserts inside a single SQLite
transaction — comfortably sub-second on the target hosts.
**Constraints**: (a) Single-screen layout from feature 001 (no full-page scroll) MUST be
preserved — the popover anchors to the source row and overlays a scrim, no permanent UI
chrome added. (b) Fan-out MUST be atomic; partial writes are not acceptable (FR-018,
SC-008). (c) `Until` cap enforced both client-side (immediate feedback) and server-side
(authoritative). (d) Child's local clock remains the source of truth — server validates the
window against the supplied `clientDate`/`clientTime`, same convention as feature 001's
mutating endpoints.
**Scale/Scope**: One child × one source row × ≤90 entries per series (Daily) / ≤13 (Weekly).
~1 new endpoint, ~1 new service module, ~2 new frontend modules, ~3 new test files.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Evaluated against the project constitution **v1.0.0** at `.specify/memory/constitution.md`.

- **I. Test-First Development (NON-NEGOTIABLE)** — **PASS** (plan-time). `tasks.md`
  (generated next by `/speckit-tasks`) will order contract → integration → E2E test files
  before the corresponding implementation tasks, including the failure-injection test
  that proves SC-008. Tests MUST be observed FAILING before any implementation work
  begins. No exception sought.
- **II. Specification-Driven Workflow** — **PASS**. `spec.md` (with 4 clarifications
  resolved in `## Clarifications` Session 2026-06-07), this plan, design artefacts
  (`research.md`, `data-model.md`, `contracts/`, `quickstart.md`), and the planned
  `tasks.md` together cover the full pipeline.
- **III. Simplicity & YAGNI** — **PASS**. Zero schema changes, zero new dependencies, one
  new endpoint, one new transient JS module. The popover reuses the existing
  `.modal-overlay`/`.modal-card` CSS pattern with one additional anchor-positioning class.
  Complexity Tracking is empty.
- **IV. Child-First User Experience** — **PASS**. FR-017 (kid-friendly voice across labels,
  tooltips, helper text, and error messages) and FR-019/020/021/022/023 (popover
  semantics, busy state, blocked-other-controls) are all spec-locked. SC-007 makes the
  voice measurable (Flesch–Kincaid ≤ 4). Wand-themed spinner aligns with the ocean/princess
  theme. No full-page scroll introduced.
- **V. Children's Data Protection** — **PASS**. The feature adds no new PII, no new
  third-party calls, no new logging surface. All recurrence writes are authenticated by the
  existing session middleware and tied to the existing `child_id` foreign key with cascade
  delete already wired by feature 001.

**Initial gate**: PASS.
**Post-Design re-check**: PASS — see `Phase 1 Constitution Re-check` near the bottom of
this file (after data-model and contracts are written, no decision in those documents
contradicts any principle above).

## Project Structure

### Documentation (this feature)

```text
specs/002-agenda-recurrence/
├── plan.md              # This file (/speckit-plan output)
├── research.md          # Phase 0 output — technology & design decisions
├── data-model.md        # Phase 1 output — no schema change; interaction with existing entries
├── quickstart.md        # Phase 1 output — incremental setup/run notes
├── contracts/
│   └── rest-api.md      # Phase 1 output — delta on feature 001's REST contract
├── checklists/
│   └── requirements.md  # Spec quality checklist (/speckit-specify)
├── assets/
│   └── recurrence-affordance.md   # Where mock2.jpg's details landed (/speckit-clarify)
└── spec.md              # Feature specification (with Clarifications section)
```

### Source Code (repository root) — **deltas on top of feature 001's tree**

Only changed/added files are shown below; everything else from feature 001 is unchanged.

```text
backend/
├── src/
│   ├── routes/
│   │   └── days.js                   # MODIFY: add POST /:date/agenda/:hour/recurrence
│   ├── services/
│   │   └── recurrenceService.js      # ADD: build target dates, atomic fan-out
│   └── lib/
│       └── time.js                   # MODIFY: addDays(), enumerateDates(),
│                                     #         enumerateMatchingWeekdays(), capUntil()
└── tests/
    ├── contract/
    │   └── days-recurrence.test.js   # ADD: POST /recurrence contract tests
    └── integration/
        └── us4-recurrence.test.js    # ADD: includes the SC-008 failure-injection test

frontend/
├── css/
│   └── styles.css                    # MODIFY: anchor-positioning + wand-spinner keyframes
└── js/
    ├── api.js                        # MODIFY: api.applyRecurrence(date, hour, body)
    └── components/
        ├── agenda.js                 # MODIFY: render ↻ icon on filled, non-elapsed rows
        └── recurrence.js             # ADD: popover component + validation + spinner

backend/tests/e2e/
├── us4-recurrence-daily.spec.js      # ADD: P1 happy-path Daily recurrence
└── us5-recurrence-weekly.spec.js     # ADD: P2 Weekly recurrence + cap rejection
```

**Structure Decision**: Reuse feature 001's web-application structure verbatim. No new
top-level folders. The frontend gets one new component module (`recurrence.js`) and the
backend gets one new service module (`recurrenceService.js`); both are scoped to the
agenda slice and have no dependencies on feature 001 changes other than the existing
`agendaService` and the existing time helpers.

## Phase 0 Research Summary

See [research.md](research.md) for full decisions and rejected alternatives. In brief:

1. **Storage model** — Independent copies in existing `agenda_entries`. No `agenda_series`
   table. Decided by FR-015 (independence) and Clarification Q1 (re-apply does not
   delete tail).
2. **Atomicity** — `DatabaseSync` in `node:sqlite` supports raw `BEGIN`/`COMMIT`/`ROLLBACK`
   via `db.exec()`. The fan-out wraps a single prepared upsert in `BEGIN`/`COMMIT` with a
   `try/catch` that runs `ROLLBACK` on any error (FR-018, SC-008).
3. **API shape** — One new endpoint `POST /api/days/{date}/agenda/{hour}/recurrence`,
   slotted under the existing `/api/days` router so it inherits the same auth middleware.
4. **Popover surface** — DOM-positioned anchored popover, scrim covering the rest of the
   dashboard. Reuses `.modal-overlay` for the scrim and adds one new `.repeat-popover`
   class with absolute positioning relative to the source row. Clarification Q3.
5. **Busy indicator** — Wand emoji 🪄 in a CSS `@keyframes` rotate; emoji avoids extra
   asset shipping while matching the ocean/princess theme. Clarification Q4.
6. **Client-side cap preview** — Frontend computes `today + 90 days` for the `<input
   type="date" max="…">` attribute so the date picker itself blocks out-of-range dates,
   but the server still validates (defence in depth).

## Phase 1 Design Summary

- **data-model.md** — No schema change. `agenda_entries` table holds all generated copies.
  Documents the upsert semantics, the per-target-slot uniqueness key, and the cascade
  guarantees inherited from feature 001's schema.
- **contracts/rest-api.md** — Delta document describing the new endpoint, its request /
  response shapes, the 7 distinct error codes, and the traceability back to FRs.
- **quickstart.md** — Notes that no `npm run init-db` or env change is needed. New test
  files run under the same `npm test` / `npm run test:e2e` commands.

## Phase 1 Constitution Re-check

After writing `data-model.md`, `contracts/rest-api.md`, and `quickstart.md`:

- **I. Test-First** — Still PASS. Designs are testable; the failure-injection seam in
  `recurrenceService` is explicit so SC-008 is fully observable.
- **II. Spec-Driven** — Still PASS. All design decisions trace back to FRs or
  Clarifications; no orphaned design choices.
- **III. Simplicity & YAGNI** — Still PASS. No design decision added new dependencies,
  introduced a new entity, or required configuration knobs.
- **IV. Child-First UX** — Still PASS. The popover/spinner/voice rules from FR-019..023
  and FR-017 are honoured in the design and the quickstart's smoke test references them.
- **V. Children's Data Protection** — Still PASS. New endpoint uses existing auth
  middleware; no new collection, retention, or third-party surface.

**Post-Design gate**: PASS — no Complexity Tracking entries required.

## Complexity Tracking

No constitution gates are violated, and the design introduces no exceptional complexity
requiring justification. Recurrence is a pure extension of existing primitives: one new
endpoint, one new service, one new frontend component, zero schema or dependency churn.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| _None_ | — | — |
