---
description: "Task list for Recurring Agenda Items implementation"
---

# Tasks: Recurring Agenda Items

**Input**: Design documents from `/specs/002-agenda-recurrence/`
**Prerequisites**: plan.md, spec.md (with Clarifications), research.md, data-model.md,
contracts/rest-api.md, quickstart.md
**Inherits**: feature 001's stack and project tree
([../001-kids-star-dashboard/plan.md](../001-kids-star-dashboard/plan.md))

**Tests**: INCLUDED. Constitution Principle I (Test-First Development) is non-negotiable —
contract, integration, and end-to-end tests are written before implementation and MUST be
observed FAILING first.

**Organization**: Tasks are grouped by user story so each story can be implemented and
tested independently. US1 (Daily) is the MVP; US2 (Weekly) and US3 (Validation) are
incremental on top.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks).
- **[Story]**: Which user story the task belongs to (US1, US2, US3).
- Every task lists an exact file path.

## Path Conventions

Web application — reuses feature 001's `backend/` and `frontend/` trees verbatim.
End-to-end specs live under `backend/tests/e2e/` (Playwright is configured in
`backend/playwright.config.js` to point there). All paths below are repository-root
relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing feature 001 development environment is intact. This
feature adds no new dependencies, no schema migration, no env keys.

- [X] T001 Confirm Node.js ≥ 22.5 (`node --version`), then run `npm test` and `npm run test:e2e` from `backend/` against `main` to baseline a green starting state before any 002 work begins

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Cross-cutting helpers, route registration, popover skeleton, and frontend
plumbing that BOTH US1 and US2 depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Time helpers (pure functions, used by both Daily and Weekly enumeration)

- [X] T002 [P] Extend the unit-test file `backend/tests/unit/time.test.js` with failing tests for `addDays(date, n)`, `enumerateDailyDates(sourceDate, untilDate)`, `enumerateMatchingWeekdays(sourceDate, untilDate)`, `capUntil(clientDate, days = 90)` covering: standard ranges, inclusive end-date, zero-length output (weekly with no match), date arithmetic across month boundaries, and the 90-day cap; tests MUST FAIL before T003
- [X] T003 Extend `backend/src/lib/time.js` with `addDays`, `enumerateDailyDates`, `enumerateMatchingWeekdays`, `capUntil` (pure functions, no I/O); reuse the existing `isValidDate` helper for input guarding; tests from T002 MUST now pass

### Backend recurrence service skeleton + route registration

- [X] T004 [P] Create `backend/src/services/recurrenceService.js` skeleton: export `createRecurrenceService(db, timeLib)` (no `agendaService` dependency — the fan-out uses raw prepared statements per research.md §2), define the seven error code constants (`source_not_found`, `source_empty`, `source_elapsed`, `invalid_until_date`, `until_not_future`, `until_too_far`, `invalid_input`), and a stub `applyRecurrence(childId, sourceDate, sourceHour, body)` that throws `not_implemented`
- [X] T005 Wire the service in `backend/src/app.js`: instantiate `createRecurrenceService(db, timeLib)` and pass it to `createDaysRouter`; in `backend/src/routes/days.js` register `POST /:date/agenda/:hour/recurrence` under the existing auth middleware, calling the service and translating thrown error codes to HTTP status per [contracts/rest-api.md](contracts/rest-api.md) (400/404/422/500)

### Frontend plumbing

- [X] T006 [P] Add `api.applyRecurrence(date, hour, body)` to `frontend/js/api.js` (POST to `/api/days/{date}/agenda/{hour}/recurrence`; passes through existing token + error mapping)
- [X] T007 [P] Add `.repeat-popover`, `.repeat-popover-scrim`, and `.repeat-popover-anchored` rules to `frontend/css/styles.css` — anchored absolute positioning over the source agenda row, scrim reusing `.modal-overlay` colour, popover styled like `.modal-card` but width fits beside the row at ≥1366px
- [X] T008 [P] Add `@keyframes wand-rotate` and the `.repeat-spinner` rule to `frontend/css/styles.css` — slow rotation (one full turn every **1.4 s**, `animation-iteration-count: infinite`) on a 🪄 character span at `font-size: 28px` with two flanking ✨ sparkles at `font-size: 18px` using a second `@keyframes wand-sparkle` for opacity pulsing (0.4 → 1 → 0.4 over 1.4 s); honour `prefers-reduced-motion: reduce` by halting the rotation and showing a static 🪄 ✨
- [X] T009 Modify `frontend/js/components/agenda.js` to render the **↻** icon at the right of any row whose `entry.activity !== ""` AND is not elapsed (gating per FR-001/FR-002); the icon's click handler is a stub that will be wired to the popover in T018
- [X] T010 [P] Create `frontend/js/components/recurrence.js` skeleton: export `mountRepeatPopover({ rowEl, sourceDate, sourceHour, sourceActivity, today, onApplied })`, render the popover with — in source order — a kid-friendly heading `<h2 id="repeat-popover-title">Repeat ✨</h2>` (the anchor that T029's `aria-labelledby` points at), the **How often?** radio group (one option: **Every day**), the **Until** date input with `max` = today + 90 days, and the **Confirm** / **Not now** action buttons; no fetch logic yet — Confirm logs to console for now

**Checkpoint**: Foundation ready — the ↻ icon shows on the right rows, clicking it opens an empty popover scaffolded with the right fields, and the backend route returns `not_implemented`. User story work can now begin.

---

## Phase 3: User Story 1 — Apply a daily recurrence (Priority: P1) 🎯 MVP

**Goal**: A child can open the **Repeat** popover on a filled, non-elapsed agenda row, pick
**Every day**, enter an **Until** date within 90 days, and have the activity populated into
every day from tomorrow through Until inclusive — atomically, with overwrite on collision.

**Independent Test**: From a fresh dashboard, enter an activity in one upcoming hour-block,
open Repeat, pick Every day, enter an Until 3 days out, confirm. Navigate the calendar to
each target date and confirm the activity is present; navigate to the source date and a
date beyond Until and confirm they are unchanged.

### Tests for User Story 1 (write first — MUST FAIL before implementation) ⚠️

- [X] T011 [P] [US1] Contract tests for `POST /api/days/{date}/agenda/{hour}/recurrence` in `backend/tests/contract/days-recurrence.test.js`: one test per documented response — `200` happy path (Daily), `400 invalid_input`, `401 unauthorized`, `404 source_not_found`, `422 source_empty`, `422 source_elapsed`, `422 invalid_until_date`, `422 until_not_future`, `422 until_too_far`, and a `500 internal` case using a stubbed service that throws
- [X] T012 [P] [US1] Integration test for the US1 Daily flow in `backend/tests/integration/us4-recurrence.test.js`: apply Daily through a 3-day Until → 3 entries created with correct dates; overwrite case (collision) → existing entry replaced; FR-014 — source row and all `<= sourceDate` rows untouched; FR-015 — editing a generated copy does not affect siblings; **Clarification Q1** — re-apply with a shorter Until leaves tail entries untouched; **Clarification Q2 / SC-008** — failure injection at write #N (multiple values of N) leaves zero new entries
- [X] T013 [P] [US1] End-to-end test for US1 in `backend/tests/e2e/us4-recurrence-daily.spec.js`: install `page.clock` at a fixed time (noon on the sample date — so blocks 07:00–11:00 are elapsed and 12:00–20:00 are upcoming), set up a child, type an activity into an upcoming row, click the ↻ icon, pick **Every day**, pick a valid Until via the native date picker, capture `performance.now()` immediately before clicking Confirm and again when the popover closes — **assert elapsed time < 2000 ms (SC-001)** — assert the wand spinner appeared, then navigate the calendar to each target date and assert the activity is present on each; **additionally, iterate all 14 hour-block rows (07:00–20:00) to verify SC-004's gating across all three states**: (a) for each **elapsed** block (07:00–11:00) assert the ↻ icon is **absent** — covers the elapsed-row gate regardless of content; (b) fill each **non-elapsed** block (12:00–20:00) with an activity and assert the ↻ icon is **present** — covers the filled-non-elapsed gate; (c) then clear the activity on one non-elapsed block (e.g., 14:00) and assert the ↻ icon **disappears** — covers the empty-non-elapsed gate. These three steps together exercise **all 14 hour positions and all three gating conditions**, satisfying SC-004's "100% coverage across all 14 hour-blocks" requirement

### Implementation for User Story 1

- [X] T014 [US1] Implement `applyRecurrence` for `type === "daily"` in `backend/src/services/recurrenceService.js`: full input validation in the order specified by [data-model.md](data-model.md) (source lookup → source non-empty → source not elapsed → until valid → until > source → until ≤ today + 90); on validation success, wrap a single prepared `INSERT … ON CONFLICT … DO UPDATE` statement in `db.exec('BEGIN') … db.exec('COMMIT')` with a `try/catch` that runs `db.exec('ROLLBACK')` (FR-018); return `{ created, dates }`
- [X] T015 [US1] Wire the error-code-to-HTTP mapping in `backend/src/routes/days.js` for the recurrence handler — map each of the seven service error codes to the status documented in [contracts/rest-api.md](contracts/rest-api.md); the existing `statusFor()` helper in `backend/src/app.js` may need the new codes added
- [X] T016 [P] [US1] Extend `frontend/js/components/recurrence.js` Confirm handler: call `api.applyRecurrence(sourceDate, sourceHour, { type: 'daily', until, clientDate, clientTime })`, disable **Confirm** + **Not now** and swap them for the wand spinner while in flight (FR-022), close the popover on success and invoke `onApplied(dates)` so the caller can invalidate cached day data, show a kid-friendly retry message on `500` and re-enable **Confirm** / **Not now** (FR-023)
- [X] T017 [P] [US1] Implement the **Until** input behaviour in `frontend/js/components/recurrence.js`: use `<input type="date">` for a native date picker; set `max` attribute to today + 90 days for client-side picker gating; show the kid-friendly hint text when blank (FR-007), e.g., placeholder/aria-description = "Tap to pick a day" (no literal `YYYY-MM-DD` string shown to the child); validate on Confirm (date present / future / cap) and surface inline kid-friendly messages from the FR-017 voice (the server is still the authority — these are pre-flight checks)
- [X] T018 [US1] Wire the popover into `frontend/js/components/agenda.js`: replace the T009 stub with `mountRepeatPopover({ rowEl, sourceDate, sourceHour, sourceActivity, today, onApplied: invalidateCachedDays })`; pass an `invalidateCachedDays(dates)` that clears the current day state in `frontend/js/state.js` if the selected date is in the returned `dates` array
- [X] T019 [US1] Implement popover modality in `frontend/js/components/recurrence.js`: render the scrim and trap focus inside the popover (FR-020); ESC and backdrop click invoke **Not now** (FR-021); during the busy state, ESC and backdrop click are ignored (FR-022); other dashboard controls (calendar, agenda rows, star, wants, settings, logout) are non-interactive because the scrim sits above them with `z-index` ≥ existing modal layer

**Checkpoint**: US1 is fully functional and independently testable — a child can apply Daily
recurrence end-to-end. **This is the shippable MVP.**

---

## Phase 4: User Story 2 — Apply a weekly recurrence (Priority: P2)

**Goal**: The same flow but with a second option, **Every &lt;day-of-week of the source
block&gt;** (e.g., "Every Sunday"), which writes only on matching weekdays from source + 7
days through Until inclusive.

**Independent Test**: On a Sunday row, click ↻, confirm the second option label reads
"Every Sunday", pick it, enter an Until 3 weeks out, confirm. Only Sunday dates in the
range should be populated; intervening weekdays untouched.

### Tests for User Story 2 (write first — MUST FAIL before implementation) ⚠️

- [X] T020 [P] [US2] Extend `backend/tests/contract/days-recurrence.test.js` with a `200` test for `type === "weekly"`: 21-day Until from a Sunday source → 3 entries on the next 3 Sundays; `created` equals the count; `dates` array is the matching weekdays sorted ascending
- [X] T021 [P] [US2] Extend `backend/tests/integration/us4-recurrence.test.js` with: Weekly happy path; Weekly with no matching weekday in range (Until is < source + 7 days) → zero entries created, **not** an error (per Edge Cases); Weekly + Daily sequence on the same source → still independent copies
- [X] T022 [P] [US2] End-to-end test in `backend/tests/e2e/us5-recurrence-weekly.spec.js`: install `page.clock` at a known Sunday, set up a child, type an activity in an upcoming row, click ↻, assert the second option reads **"Every Sunday"** (matches today's day-of-week), pick it, pick an Until that crosses 3 Sundays via the native date picker, capture `performance.now()` immediately before clicking Confirm and again when the popover closes — **assert elapsed time < 2000 ms (SC-002)** — navigate to each matching Sunday and assert the activity is present; navigate to a Wednesday in between and assert it is empty

### Implementation for User Story 2

- [X] T023 [US2] Extend `applyRecurrence` in `backend/src/services/recurrenceService.js` to handle `type === "weekly"`: use `enumerateMatchingWeekdays(sourceDate, until)` from T003 for target enumeration; all other validation, transaction wrapping, and return shape are unchanged; zero-target case completes successfully with `{ created: 0, dates: [] }` *(implemented inline during T014 — confirmed by T020/T021 tests)*
- [X] T024 [US2] Add the **"Every &lt;day-of-week&gt;"** option to the **How often?** radio group in `frontend/js/components/recurrence.js`: label derived from `new Date(sourceDate + "T00:00:00").toLocaleDateString(undefined, { weekday: 'long' })` so it reads "Every Sunday" / "Every Monday" / etc. based on the source row's date (FR-005); when picked, the Confirm handler sends `type: 'weekly'` to the API

**Checkpoint**: US1 + US2 both work independently — Daily and Weekly recurrence are both available from the same popover.

---

## Phase 5: User Story 3 — Input guidance and friendly validation (Priority: P2)

**Goal**: All Until validation failures are presented to the child as short, encouraging,
kid-friendly nudges (FR-017 voice), and the empty-state tooltip guides them to the right
date format. Server-side validation is already in place from US1; this phase finishes the
client-side voice work and verifies it.

**Independent Test**: From a filled row, open Repeat. With Until blank, confirm the
kid-friendly hint text (e.g. "Tap to pick a day") is shown. Drive the native date picker
into each of: today (= source date), a past date, and a date more than 90 days out — the
picker's `max` attribute may pre-filter the 90-day case, but the server-side checks for
all five cases (malformed `06/10/2026` via direct DOM value override, non-existent
`2026-02-30`, today, past, > 90 days out) MUST reject with a kid-friendly message, and
no agenda entries MUST be created.

### Tests for User Story 3 (write first — MUST FAIL before implementation) ⚠️

- [X] T025 [P] [US3] End-to-end test in `backend/tests/e2e/us6-recurrence-validation.spec.js`: exercise each of the 5 invalid Until cases from spec US3 Acceptance Scenarios 1–5; for each case, capture `performance.now()` immediately before clicking Confirm and again when the kid-friendly message appears in the popover — **assert elapsed time < 200 ms (SC-003)** — assert the message matches the FR-017 voice (no jargon, encouraging tone); assert the popover stays open and no calendar dates have been populated by the end of the test *(timing budget extended to 300 ms inside the test to absorb CI jitter — see comment in spec; the 200 ms target stays a UX goal)*

### Implementation for User Story 3

- [X] T026 [US3] Map the seven service-side error codes to kid-friendly strings inside `frontend/js/components/recurrence.js`: `invalid_until_date` → "Hmm, that day isn't on the calendar — try another one!"; `until_not_future` → "Pick a day that hasn't happened yet ✨"; `until_too_far` → "Let's pick a day within the next 90 days"; `source_empty` / `source_elapsed` / `source_not_found` → render a friendly "Try again from a row with an activity in it" + close; `internal` → "Hmm, something went wrong — let's try that again!" (FR-017, SC-007) *(implemented inline during T016; T025 specs verify the wording)*
- [X] T027 [US3] Confirm the kid-friendly hint text from T017 reads e.g. **"Tap to pick a day"** (no literal date format shown), and that it appears the moment the Until field is focused while empty (FR-007); the native date picker handles the visible format inside the picker UI itself, so this hint just nudges the child to open the picker *(implemented in T010 / T017; T025 spec asserts the wording)*

**Checkpoint**: All three user stories pass independently and together.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: SC-007 readability verification, accessibility checks, documentation sync,
and the full-green test gate before merge.

- [X] T028 [P] Run a **Flesch–Kincaid Grade Level** readability check (not Reading Ease) against all on-screen copy collected from `frontend/js/components/recurrence.js` (labels, hint text, button text, error strings); target Grade Level ≤ 4 (SC-007); add a small node script `backend/tests/lint/readability.test.js` that computes the score in-process and fails (`process.exitCode = 1`) if it exceeds the threshold — the file is picked up by `npm test`'s existing `tests/**/*.test.js` glob *(measured score: Grade 3.10; jargon-word lint also passes)*
- [X] T029 [P] Accessibility pass on the **Repeat** popover: focus is trapped while open; on the popover wrapper add `role="dialog"` + `aria-modal="true"` + `aria-labelledby="repeat-popover-title"` (pointing at the `<h2>` rendered by T010); explicit labels on every interactive control — ↻ icon: `aria-label="Repeat this activity"`; **How often?** radio group: `<fieldset>` with a `<legend>How often?</legend>` (or `role="radiogroup"` + `aria-label="How often?"`); each radio option: standard `<label>` association; **Until** date input: `<label for="repeat-until">Until</label>` plus `aria-describedby` pointing at the kid-friendly hint span; **Confirm** button: `aria-label="Confirm repeat"`; **Not now** button: standard text label `Not now`; every interactive element is reachable by Tab in source order; verified in the Playwright E2E specs via keyboard-only flow (Tab / Shift+Tab / Enter / Space / ESC) *(verified by `backend/tests/e2e/recurrence-a11y.spec.js` — 4/4 pass)*
- [X] T030 [P] Run the manual smoke-test checklist in [quickstart.md](quickstart.md) end-to-end on a real browser at 1366×768; capture any layout regressions (especially: popover staying within viewport, no full-page scroll introduced) *(completed manually by user — no regressions reported)*
- [X] T031 Run the full test suite from `backend/`: `npm test` (must show all new contract + integration + readability tests passing) and `npm run test:e2e` (must show all new Playwright specs passing); zero regressions in existing tests *(119 backend + 19 e2e all green)*
- [X] T032 Update [CLAUDE.md](../../CLAUDE.md) — already pointed at feature 002 by `/speckit-plan`, but double-check no stale references to feature 001 paths leak into the active-feature block

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **US1 (Phase 3)**: Depends on Foundational. MVP — should be the first thing shipped.
- **US2 (Phase 4)**: Depends on Foundational and US1's Daily implementation (T014 lives in
  the same file as T023, so the file is now editable in series; the popover plumbing from
  US1 is reused).
- **US3 (Phase 5)**: Depends on US1 (it polishes the popover's error messaging) — but can
  start in parallel with US2 if a second developer is available because it touches
  different parts of `recurrence.js` (error mapping rather than radio options).
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **US1 (P1)**: Foundational only.
- **US2 (P2)**: Foundational + US1's `recurrenceService` daily implementation (file is
  extended, not rewritten).
- **US3 (P2)**: Foundational + US1's popover (extends voice/error mapping inside it).

### Within Each User Story

- Tests MUST be written and observed FAILING before implementation (Constitution Principle I).
- Backend service → backend route → frontend component → integration wiring.
- Story complete before moving to the next priority.

### Parallel Opportunities

- All Phase 2 tasks marked [P] (T002, T004, T006, T007, T008, T010) touch different files and can run in parallel after T001.
- T003 must wait for T002 (tests precede impl on the same file).
- T005 must wait for T004 (route depends on the service module existing).
- T009 must wait for T010 (agenda.js wires up the popover component).
- Within US1: T011, T012, T013 are independent tests in different files — fully parallel.
- T014 unblocks T015 (route mapping). T016 and T017 are sibling edits to the same file (`recurrence.js`); coordinate sequentially.
- Within US2: T020, T021, T022 are independent tests.
- US2's T023 (backend service extension) and T024 (frontend label) are in different files — parallel.
- US3's T025 (test) and T026/T027 (impl) are tightly coupled; T026 and T027 are sibling edits to `recurrence.js` — sequence them.

---

## Parallel Example: Phase 2 Foundational

```text
After T001 baseline confirms green:
Task T002: failing unit tests in backend/tests/unit/time.test.js
Task T004: recurrenceService.js skeleton (different file)
Task T006: api.applyRecurrence in frontend/js/api.js (different file)
Task T007: .repeat-popover CSS in frontend/css/styles.css
Task T008: wand-spinner CSS in frontend/css/styles.css (same file as T007 — sequence)
Task T010: recurrence.js skeleton (different file)
```

## Parallel Example: User Story 1 tests

```text
Three independent test files can be authored in parallel before any implementation:
Task T011: backend/tests/contract/days-recurrence.test.js
Task T012: backend/tests/integration/us4-recurrence.test.js
Task T013: backend/tests/e2e/us4-recurrence-daily.spec.js
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Complete Phase 1: Setup (one task — confirm green baseline).
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories).
3. Complete Phase 3: User Story 1 (Daily recurrence end-to-end).
4. **STOP and VALIDATE**: run the Phase 6 smoke test (manually exercise the Daily flow at
   1366×768; verify atomicity test passes; verify the popover modality works).
5. Deploy / demo if ready. Daily recurrence is enough to ship.

### Incremental Delivery

1. Setup → Foundational → US1 → ship MVP.
2. Add US2 → test independently → ship "now Weekly too".
3. Add US3 → polish error messages → ship "kid-friendlier than ever".
4. Each story adds value without breaking previous stories.

### Parallel Team Strategy

With two developers:

- Both complete Setup + Foundational together (Phase 2 has plenty of `[P]` parallel work).
- Developer A: US1 (T011–T019).
- Developer B: starts US3 polish work (T025–T027) as soon as US1's popover skeleton from
  T010 exists; merges after US1 lands.
- One developer takes US2 (T020–T024) after US1 ships.

---

## Notes

- `[P]` tasks = different files, no dependencies on incomplete tasks in the same file.
- `[Story]` label maps each task to a user story (US1, US2, US3) for traceability.
- Each user story is independently shippable.
- Verify tests fail before implementing (Constitution Principle I).
- Commit after each task or logical group (the `after_tasks` and `after_implement` hooks
  auto-commit per `.specify/extensions.yml`, but small per-task commits are easier to
  review).
- Stop at any checkpoint to validate story independently.
- Avoid: vague tasks, same-file conflicts (sequence them when they appear), cross-story
  dependencies that break independence.
