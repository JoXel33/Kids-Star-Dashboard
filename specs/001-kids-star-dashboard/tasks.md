---
description: "Task list for Kids Star Dashboard implementation"
---

# Tasks: Kids Star Dashboard — Daily Planner & Star Reward System

**Input**: Design documents from `/specs/001-kids-star-dashboard/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/rest-api.md, quickstart.md

**Tests**: INCLUDED. The implementation plan adopts Test-First (TDD) — contract, integration,
and end-to-end tests are written before implementation and must fail first.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested
independently.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story the task belongs to (US1, US2, US3)
- Every task lists an exact file path.

## Path Conventions

Web application — `backend/` (Node.js + Express + SQLite) and `frontend/` (vanilla
HTML/CSS/JS), both served by one Express process. Paths below are repository-root relative.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and tooling.

- [X] T001 Create the `backend/` and `frontend/` directory structure per plan.md (`backend/src/{db,middleware,routes,services,lib}`, `backend/tests/{contract,integration,unit}`, `backend/data/`, `frontend/{css,js/components,tests/e2e}`)
- [X] T002 Initialize the backend Node.js project in `backend/package.json` (`"type": "module"`; dependencies `express`, `better-sqlite3`; devDependencies `supertest`, `@playwright/test`; scripts `start`, `dev`, `init-db`, `test`, `test:e2e`)
- [X] T003 [P] Create `backend/.env.example` and `backend/.env` with `PORT=3000`, `SERVER_SECRET`, `DB_PATH=./data/dashboard.sqlite`
- [X] T004 [P] Create Playwright configuration in `backend/playwright.config.js` with `testDir` pointing at `../frontend/tests/e2e` and a webServer that runs the app

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database, server, identity, and the frontend shell — every user story depends on
these.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Database & server

- [X] T005 Create the SQLite schema in `backend/src/db/schema.sql` (tables `children`, `sessions`, `day_stars`, `agenda_entries`, `wants` with constraints and indexes per data-model.md)
- [X] T006 [P] Implement the SQLite connection module in `backend/src/db/index.js` (better-sqlite3, reads `DB_PATH`, enables `PRAGMA foreign_keys = ON`)
- [X] T007 Implement the database init script in `backend/src/db/init-db.js` (create the `data/` directory, apply `schema.sql`) — wired to the `init-db` npm script
- [X] T008 [P] Implement the HMAC hashing helper in `backend/src/lib/hash.js` (hash access codes and recovery answers with `SERVER_SECRET`; normalize input — trim + lower-case)
- [X] T009 [P] Implement client-time helpers in `backend/src/lib/time.js` (`parseClientDateTime`, `isBlockElapsed`, `isStarLocked` at 21:30, `isCountedDay`)
- [X] T010 Create the Express app in `backend/src/app.js` (JSON body parsing, static serving of `frontend/`, mount the `/api` router) and the HTTP entry point in `backend/src/server.js`
- [X] T011 Implement the session-token auth middleware in `backend/src/middleware/auth.js` (validate `Authorization: Bearer` token against the `sessions` table → attach the child)

### Identity (access code, sessions, recovery)

- [X] T012 [P] Contract tests for identity endpoints in `backend/tests/contract/identity.test.js` (`POST /api/children`, `POST /api/sessions`, `POST /api/recovery`, `GET/PATCH/DELETE /api/children/me`) — must fail before T013–T014
- [X] T013 Implement `childService` in `backend/src/services/childService.js` (create child, login by access code, recover via name + recovery answer, get/update profile, delete child)
- [X] T014 Implement identity routes in `backend/src/routes/children.js` (setup, profile `GET/PATCH/DELETE`, recovery) and `backend/src/routes/sessions.js` (login), mounted under `/api`

### Frontend shell

- [X] T015 [P] Create the single-page HTML shell in `frontend/index.html` (auth-screen container plus six empty section containers)
- [X] T016 [P] Implement the ocean/princess theme and one-screen CSS Grid layout in `frontend/css/styles.css` (palette, fonts, cards, background decorations per `assets/theme-and-layout-reference.md`; only the agenda list scrolls internally)
- [X] T017 [P] Implement the API client in `frontend/js/api.js` (fetch wrapper, Bearer token from local storage, JSON handling, error-code mapping)
- [X] T018 [P] Implement the client-side state store in `frontend/js/state.js` (selected date, child profile, cached day/wallet/wants data)
- [X] T019 [P] Implement local-clock helpers in `frontend/js/time.js` (`today`, `isBlockElapsed`, `isStarLocked` at 21:30, `isCountedDay`, time-of-day phrase)
- [X] T020 Implement the auth UI component in `frontend/js/components/auth.js` (first-use setup, login, and recovery screens)
- [X] T021 Implement the app bootstrap in `frontend/js/app.js` (load saved session, auth gate via `auth.js`, render loop that mounts section components)

**Checkpoint**: Foundation ready — the app runs, a child can be created/logged in, and the empty dashboard renders. User stories can now begin.

---

## Phase 3: User Story 1 - Plan and journal the daily agenda (Priority: P1) 🎯 MVP

**Goal**: A child is greeted by name with today's date, sees a calendar with today
highlighted, and can enter/save hourly activities — editing upcoming hours, reviewing elapsed
ones read-only, and navigating to other dates.

**Independent Test**: Open the dashboard, confirm the greeting/date/calendar render with today
selected, save an activity for an upcoming hour, navigate to another date and back, and
confirm the activity persists and elapsed hours are read-only.

### Tests for User Story 1 (write first — must fail before implementation) ⚠️

- [X] T022 [P] [US1] Contract tests for the day/agenda endpoints in `backend/tests/contract/days-agenda.test.js` (`GET /api/days/{date}`, `PUT /api/days/{date}/agenda/{hour}` including the `block_elapsed` rejection)
- [X] T023 [P] [US1] Integration test for the US1 flow in `backend/tests/integration/us1-agenda.test.js` (save activity, switch date, elapsed blocks read-only, persistence)
- [X] T024 [P] [US1] End-to-end test for US1 in `backend/tests/e2e/us1-agenda.spec.js` (greeting + date, today highlighted, 4 visible blocks + scroll, save activity, elapsed block locked)

### Implementation for User Story 1

- [X] T025 [US1] Implement `agendaService` in `backend/src/services/agendaService.js` (`getDay` returning star + 14 agenda blocks, `saveAgendaEntry` with elapsed-block validation)
- [X] T026 [US1] Implement the days route (agenda portion) in `backend/src/routes/days.js` (`GET /api/days/{date}`, `PUT /api/days/{date}/agenda/{hour}`)
- [X] T027 [P] [US1] Implement the greeting component in `frontend/js/components/greeting.js` (time-of-day phrase, child name, today's date)
- [X] T028 [P] [US1] Implement the calendar component in `frontend/js/components/calendar.js` (date selector, current day highlighted/selected by default, emits date-change events)
- [X] T029 [P] [US1] Implement the agenda component in `frontend/js/components/agenda.js` (14 one-hour blocks 07:00–21:00, 4 visible with internal scroll, edit/save upcoming blocks, elapsed blocks read-only and marked)
- [X] T030 [US1] Wire the greeting, calendar, and agenda components into the render loop in `frontend/js/app.js` (date-change updates the agenda only)

**Checkpoint**: User Story 1 is fully functional and independently testable — a usable daily planner.

---

## Phase 4: User Story 2 - Earn and track stars (Priority: P2)

**Goal**: A child can toggle "Today's Star" (locking at 21:30) and see the Star Wallet —
Stars Collected, Stars Spent, and Star Balance — with past dates' star status shown read-only.

**Independent Test**: Toggle today's star on, confirm it shows earned; navigate to a past
date and confirm its star is read-only; confirm the Star Wallet shows correct totals that do
not change with date selection.

### Tests for User Story 2 (write first — must fail before implementation) ⚠️

- [X] T031 [P] [US2] Contract tests for the star/wallet endpoints in `backend/tests/contract/star-wallet.test.js` (`PUT /api/days/{date}/star` including `star_not_today` and `star_locked`, `GET /api/wallet`)
- [X] T032 [P] [US2] Integration test for the US2 flow in `backend/tests/integration/us2-stars.test.js` (toggle star, 21:30 lock and counting, wallet totals, date-selection independence)
- [X] T033 [P] [US2] End-to-end test for US2 in `frontend/tests/e2e/us2-stars.spec.js` (toggle today's star, past-date star read-only, wallet values)

### Implementation for User Story 2

- [X] T034 [P] [US2] Implement `starService` in `backend/src/services/starService.js` (`getStar`, `setStar` with current-day and pre-21:30 validation)
- [X] T035 [P] [US2] Implement `walletService` in `backend/src/services/walletService.js` (compute Stars Collected from counted day-stars, read Stars Spent, derive Star Balance)
- [X] T036 [US2] Add the star route to `backend/src/routes/days.js` (`PUT /api/days/{date}/star`)
- [X] T037 [P] [US2] Implement the wallet route in `backend/src/routes/wallet.js` (`GET /api/wallet`)
- [X] T038 [P] [US2] Implement the star component in `frontend/js/components/star.js` (toggle for today only, locked after 21:30, read-only for other dates)
- [X] T039 [P] [US2] Implement the wallet component in `frontend/js/components/wallet.js` (Stars Collected, Stars Spent, Star Balance; unaffected by date selection)
- [X] T040 [US2] Wire the star and wallet components into the render loop in `frontend/js/app.js`

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - Maintain and redeem rewards (Priority: P3)

**Goal**: A child maintains up to 3 Wants (description + cost 1–5 stars), redeems one when
the Star Balance is sufficient (the Want is removed and Stars Spent increases), removes
non-redeemed Wants, and adds Wants when fewer than 3 exist.

**Independent Test**: Add a Want, redeem it when affordable and confirm removal + balance
update, confirm no redeem option when unaffordable, confirm a non-redeemed Want can be
removed, and confirm no 4th Want can be added.

### Tests for User Story 3 (write first — must fail before implementation) ⚠️

- [X] T041 [P] [US3] Contract tests for the wants endpoints in `backend/tests/contract/wants.test.js` (`GET/POST/DELETE /api/wants`, `POST /api/wants/{id}/redeem` including `want_limit_reached` and `insufficient_balance`)
- [X] T042 [P] [US3] Integration test for the US3 flow in `backend/tests/integration/us3-rewards.test.js` (add/remove, redeem with balance check and Stars Spent update, 3-Want limit, date-selection independence)
- [X] T043 [P] [US3] End-to-end test for US3 in `frontend/tests/e2e/us3-rewards.spec.js` (add Want, redeem when affordable, no redeem when not, remove Want, add disabled at 3)

### Implementation for User Story 3

- [X] T044 [US3] Implement `wantService` in `backend/src/services/wantService.js` (list, add with the 3-Want limit, remove, redeem as a single transaction validating balance and incrementing `stars_spent`)
- [X] T045 [US3] Implement the wants route in `backend/src/routes/wants.js` (`GET/POST/DELETE /api/wants`, `POST /api/wants/{id}/redeem`)
- [X] T046 [US3] Implement the rewards component in `frontend/js/components/rewards.js` (list of ≤3 Wants with description and 1–5 star cost rating, add when fewer than 3, remove non-redeemed, redeem only when affordable)
- [X] T047 [US3] Wire the rewards component into the render loop in `frontend/js/app.js`

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements spanning multiple user stories.

- [X] T048 [P] Verify all six sections fit one screen with no full-page scroll at 1366×768 and adjust `frontend/css/styles.css`
- [X] T049 [P] Add loading, empty, and error states to all section components in `frontend/js/components/`
- [X] T050 [P] Add unit tests for `backend/src/lib/hash.js` and `backend/src/lib/time.js` in `backend/tests/unit/`
- [X] T051 Run the `quickstart.md` smoke-test checklist end-to-end and fix any issues found
- [X] T052 [P] Update the repository `README.md` with setup, run, and test instructions

### Children's data protection (Constitution Principle V follow-up)

Addresses `/speckit-analyze` finding **C2**: the backend `DELETE /api/children/me` endpoint
exists (T014), but no UI control wires it. Required by Principle V ("deletable on demand").

- [X] T053 [P] End-to-end test for "Delete my data" in `frontend/tests/e2e/data-deletion.spec.js` (open settings, confirm the dialog, verify `DELETE /api/children/me` is called, the local session is cleared, and the first-use setup screen is shown) — must fail before T054 / T055
- [X] T054 [P] Add the settings component in `frontend/js/components/settings.js` (a "Delete my data" control plus a confirmation dialog; on confirm, call `DELETE /api/children/me`, clear the local session, and return to the first-use setup)
- [X] T055 Wire the settings component into the render loop in `frontend/js/app.js`

### Name editability (FR-003 follow-up)

Addresses `/speckit-analyze` finding **C1**: FR-003 requires the child to be able to set AND
change their name. First-use setup (T020) collects it and the greeting (T027) displays it,
but no task provides an edit affordance. Backend `PATCH /api/children/me` already exists
(T014).

- [X] T056 [P] End-to-end test for name editing in `frontend/tests/e2e/name-edit.spec.js` (logged-in user clicks the name in the greeting, edits it, saves, reloads, and the new name persists) — must fail before T057
- [X] T057 [P] Add an inline name-edit affordance to `frontend/js/components/greeting.js` (click/tap the name → input → save → call `PATCH /api/children/me` → update state and re-render the greeting)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup — **blocks all user stories**.
- **User Stories (Phases 3–5)**: All depend on Foundational. Once it is done, US1/US2/US3 can
  proceed in parallel (different files) or sequentially in priority order P1 → P2 → P3.
- **Polish (Phase 6)**: Depends on all targeted user stories being complete.

### User story dependencies

- **US1 (P1)**: Depends only on Foundational. No dependency on other stories. → MVP.
- **US2 (P2)**: Depends only on Foundational. Independent of US1 (T036 adds to `days.js`,
  created in US1 — if US2 runs before US1, T036 creates `days.js` instead).
- **US3 (P3)**: Depends only on Foundational. `wantService` (T044) uses `walletService`
  (T035) for balance checks; if US3 runs before US2, build `walletService` first.

### Within each phase

- Tests are written before implementation and must fail first.
- Database/lib helpers → services → routes (backend); api/state/time → components → app
  wiring (frontend).
- Tasks editing the same file are sequential (e.g., T026/T036 both touch `days.js`;
  T030/T040/T047 all touch `app.js`).

## Parallel Execution Examples

**Setup**: T003 and T004 can run together.

**Foundational** — after T005 (schema):

```text
T006, T008, T009 together   # db/index.js, lib/hash.js, lib/time.js
T015, T016, T017, T018, T019 together   # frontend shell files
```

**User Story 1** — after backend endpoints exist:

```text
T022, T023, T024 together   # contract, integration, e2e tests
T027, T028, T029 together   # greeting.js, calendar.js, agenda.js
```

**User Story 2**:

```text
T031, T032, T033 together   # tests
T034, T035 together         # starService, walletService
T038, T039 together         # star.js, wallet.js
```

**User Story 3**:

```text
T041, T042, T043 together   # tests
```

## Implementation Strategy

### MVP first (User Story 1 only)

1. Phase 1: Setup
2. Phase 2: Foundational (CRITICAL — blocks all stories)
3. Phase 3: User Story 1
4. **STOP and VALIDATE** — test the daily planner independently, demo if ready.

### Incremental delivery

1. Setup + Foundational → foundation ready
2. Add US1 → test → deploy/demo (MVP: a working daily planner)
3. Add US2 → test → deploy/demo (stars + wallet)
4. Add US3 → test → deploy/demo (rewards + redemption)
5. Polish

### Parallel team strategy

After Foundational completes, US1/US2/US3 can be assigned to different developers — each story
is independently testable and touches mostly separate files (coordinate on the shared
`days.js` and `app.js`).

## Notes

- [P] = different files, no dependency on an incomplete task.
- [Story] label maps each task to a user story for traceability.
- Write tests first and confirm they fail before implementing (TDD per plan.md).
- Commit after each task or logical group (Spec Kit auto-commit is enabled).
- Stop at any checkpoint to validate a story independently.

## Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Phase 1 — Setup | T001–T004 | 4 |
| Phase 2 — Foundational | T005–T021 | 17 |
| Phase 3 — US1 (P1, MVP) | T022–T030 | 9 |
| Phase 4 — US2 (P2) | T031–T040 | 10 |
| Phase 5 — US3 (P3) | T041–T047 | 7 |
| Phase 6 — Polish | T048–T057 | 10 |
| **Total** | | **57** |
