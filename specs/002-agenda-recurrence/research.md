# Phase 0 Research: Recurring Agenda Items

This document records the technology and design decisions that resolve every "NEEDS
CLARIFICATION" item in plan.md's Technical Context, and the alternatives considered.

## 1. Storage model — independent copies vs. a linked series

- **Decision**: Reuse the existing `agenda_entries` table. When recurrence is applied, write
  one independent row per target (date, hour) slot. **No new entity, no schema change.**
- **Rationale**:
  - Spec **FR-015** mandates that generated entries are independent of the source.
  - Clarification **Q1** confirms that re-applying with a shorter `Until` MUST NOT delete
    earlier entries past the new `Until` — only an independent-copies model is consistent
    with this.
  - The existing `UNIQUE (child_id, date, hour)` constraint plus `ON CONFLICT DO UPDATE`
    gives us free overwrite semantics (FR-013) with no extra application code.
  - Zero migration risk on existing production data.
- **Alternatives rejected**:
  - **Linked series (new `agenda_series` table)**: would let us implement "remove the whole
    series" later, but Clarification Q1 explicitly rejects auto-deletion semantics, and
    Assumptions explicitly mark "no remove-recurrence action" as out of scope. Adds a
    table, a join, a migration, and an FK cascade — pure YAGNI (Principle III).
  - **Store recurrence rule, expand at read time**: would minimise rows written but make
    every GET on an agenda date a recurrence evaluation. Worse read performance, worse
    test surface, and incompatible with the existing GET endpoint (which expects flat
    rows). Also breaks "edit one copy" independence required by FR-015.

## 2. Atomic fan-out — how to wrap up to 90 inserts in one transaction

- **Decision**: Use `node:sqlite`'s raw transaction primitives. Wrap the fan-out in:
  ```js
  db.exec('BEGIN');
  try {
    for (const date of targetDates) stmts.upsertAgendaEntry.run(childId, date, hour, activity);
    db.exec('COMMIT');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
  ```
  This produces all-or-nothing semantics per FR-018 and SC-008.
- **Rationale**:
  - `DatabaseSync` exposes `exec()` which accepts raw SQL strings, including the SQLite
    transaction commands.
  - SQLite's transactional guarantees are well-known and the fan-out is small (≤90 rows)
    so the transaction is short-lived; no risk of long-running locks on a single-child
    dataset.
  - Failure injection in tests is straightforward: stub one of the prepared statements to
    throw on call number N, then assert that no rows for this application exist after the
    catch.
- **Alternatives rejected**:
  - **Savepoints** (`SAVEPOINT name`): adds complexity (named scope, partial rollback)
    with no benefit — we have one logical operation, not nested ones.
  - **Per-row try/catch (best-effort)**: directly contradicts FR-018; rejected at
    clarification stage (Q2 chose A).
  - **`better-sqlite3`'s `db.transaction()` wrapper**: not applicable — the project does
    not depend on `better-sqlite3` (see feature 001 research §1).

## 3. API endpoint shape

- **Decision**: One new endpoint, `POST /api/days/{date}/agenda/{hour}/recurrence`,
  authenticated by the existing bearer-token middleware.

  Request body:
  ```jsonc
  {
    "type": "daily" | "weekly",
    "until": "YYYY-MM-DD",
    "clientDate": "YYYY-MM-DD",
    "clientTime": "HH:mm"
  }
  ```

  Successful response (`200`):
  ```jsonc
  { "created": 47, "dates": ["2026-06-08", "2026-06-09", ..., "2026-06-10"] }
  ```

  Error responses (one of):
  - `400 invalid_input` — malformed body
  - `404 source_not_found` — `(date, hour)` has no agenda entry
  - `422 source_empty` — entry exists but `activity === ""`
  - `422 source_elapsed` — block has elapsed per `clientDate`/`clientTime`
  - `422 invalid_until_date` — `until` is not a real calendar date
  - `422 until_not_future` — `until` is not strictly after `date`
  - `422 until_too_far` — `until` is more than 90 days after `clientDate`
  - `500 internal` — DB error mid-fan-out; client should display the retry message

- **Rationale**:
  - Nesting under `/api/days/{date}/agenda/{hour}` makes the source slot explicit in the
    URL — consistent with the existing `PUT /api/days/{date}/agenda/{hour}` endpoint shape
    from feature 001.
  - Returning the affected dates lets the frontend invalidate the cached `day` state for
    those dates so the next calendar click hits the wire instead of stale memory.
  - Seven distinct error codes are exactly the seven failure modes the spec enumerates;
    each is mapped to one acceptance scenario, so the tests write themselves.
- **Alternatives rejected**:
  - **`PUT /api/agenda/series`** (single resource for all of recurrence): less obvious
    where the source is; also reads as if it represents a stored series, which we
    intentionally do not have.
  - **Extending `PUT /api/days/{date}/agenda/{hour}` with an optional `recurrence` field**:
    overloads a primitive write with a fan-out side effect; harder to reason about in
    tests and breaks the "one verb = one effect" mental model that feature 001 follows.

## 4. Popover UI surface

- **Decision**: A DOM-positioned popover anchored to the source agenda row, layered on
  top of a full-dashboard scrim. The scrim reuses feature 001's `.modal-overlay` class
  (translucent backdrop, captures clicks). The popover itself adds one new class,
  `.repeat-popover`, with absolute positioning relative to the agenda row.

  Clarification Q3 locked: the popover is **modal in behaviour** — **Confirm** or
  **Not now** required to dismiss, with ESC and backdrop click acting as **Not now**.
- **Rationale**:
  - The scrim pattern already exists for the settings and logout modals; reusing it
    means zero new global UX primitives and consistent dismissal behaviour.
  - Anchoring (vs. centred) is a kid-natural cue — the popover appears where the row
    they clicked is, so they don't have to relocate visual focus.
  - Layering choice keeps the single-screen constraint from feature 001 intact: no
    permanent UI chrome is added, and the popover overlays without pushing other rows.
- **Alternatives rejected**:
  - **Centred modal overlay**: feels heavier than the action warrants and forces the
    child to look away from the row they were operating on.
  - **Inline row expansion**: pushes hour rows below the fold, violating feature 001's
    single-screen layout constraint (no full-page scroll at 1366×768).

## 5. Busy indicator — wand-themed spinner

- **Decision**: An emoji-based spinner — a 🪄 character wrapped in a `<span>` with a CSS
  `@keyframes` rotation. Two flanking ✨ sparkles fade in/out via a second keyframe.
  Replaces the **Confirm** / **Not now** button row inside the popover when the fan-out is in flight.
- **Rationale**:
  - Zero new asset to ship; matches the ocean/princess theme already in use without an SVG.
  - CSS-only animation is lightweight and reduces motion-sickness risk vs. spinning
    pinwheel SVGs because the rotation is slow (≥1.2 s/turn).
  - Clarification Q4 locked the choice of "wand-themed spinner" verbatim.
- **Alternatives rejected**:
  - **Inline SVG**: marginally crisper at high DPI but adds a static asset and CSP
    considerations for a feature that does not otherwise change asset shipping.
  - **Indeterminate progress bar**: less playful, more "office app", inconsistent with
    feature 001's aesthetic.

## 6. Client-side cap preview vs. server-side authoritative validation

- **Decision**: Both. The frontend computes `today + 90 days` and sets it as the `max`
  attribute on the `<input type="date">`, so the system's native date picker grays out
  out-of-range days. The backend re-validates against the supplied `clientDate` and rejects
  out-of-range values with `422 until_too_far`.
- **Rationale**:
  - Client preview is a kid-friendly UX win — the date picker visibly blocks bad choices
    rather than reacting after Confirm.
  - Server validation is the authoritative check because the client clock is
    user-controlled. Feature 001's existing pattern of trusting client time *with
    server re-validation against the supplied values* is the same shape and is reused
    here verbatim.
- **Alternatives rejected**:
  - **Client-only validation**: a child could disable the date picker or paste a value;
    server cannot trust raw input.
  - **Server-only**: works but produces a worse first-experience because the child only
    learns the limit after clicking Confirm.

## 7. Recurring affordance gating — when to render the ↻ icon

- **Decision**: The ↻ icon is rendered by `agenda.js`'s row renderer when both
  `entry.activity !== ""` and the block is not elapsed (per `time.js`'s existing
  `isBlockElapsed`). Otherwise the column slot is left empty (or contains the existing
  elapsed-tag text).
- **Rationale**:
  - Reuses an existing predicate — no new "can recur?" check is needed.
  - Matches FR-001/FR-002 exactly.
  - Aligns with feature 001's row layout (a 100/1fr/80px grid) — the icon occupies the
    same right-most slot as the elapsed-tag, never both at once.
- **Alternatives rejected**:
  - **Always render, disabled when not applicable**: violates the spec's "MUST NOT be
    available" wording and clutters the UI for empty rows.

## 8. Caching invalidation in the frontend

- **Decision**: After a successful recurrence application, the frontend clears its
  in-memory `day` state for the source and uses the `dates` array from the response to
  re-fetch the currently-selected date if it matches; otherwise the next calendar click
  re-fetches naturally (existing behaviour).
- **Rationale**:
  - Avoids the cache-staleness class of bug we already hit in feature 001 (the user's
    "today" date check earlier this session was an instance of this).
  - The response shape directly enables the client to be precise about what to invalidate.
- **Alternatives rejected**:
  - **Blind page reload**: throws away other in-memory state (greeting timer, calendar
    month view) for no good reason.
  - **Re-fetch the entire wallet/calendar**: wasteful; wallet does change after recurrence
    only if a generated copy enables future star earning, which is out of scope for this
    feature anyway (assumption: stars not auto-marked).

## 9. Test strategy

- **Decision**:
  - **Contract tests** (`backend/tests/contract/days-recurrence.test.js`) — one test per
    documented response: 200, 400, 404, the four 422 codes, and 500.
  - **Integration tests** (`backend/tests/integration/us4-recurrence.test.js`) — happy
    path Daily, happy path Weekly, re-apply shorter `Until` (Q1), failure injection at
    write #N for several N (SC-008/Q2). One file covers both US1 and US2 because they
    share most setup.
  - **E2E tests** (`backend/tests/e2e/`) — `us4-recurrence-daily.spec.js` and
    `us5-recurrence-weekly.spec.js`. Each freezes the browser clock with `page.clock`,
    sets up a child, opens the popover via the ↻ icon, drives the picker, asserts target
    dates populate, and asserts source/out-of-range dates are unchanged.
  - **Voice / readability check (SC-007)** — a small lint script collected with the e2e
    suite that runs a Flesch–Kincaid estimator over the collected on-screen copy. (Can be
    added in tasks.md as a polish step.)
- **Rationale**: Mirrors feature 001's TDD layout exactly so reviewers can pattern-match.

## Open Questions

None. All spec ambiguities were resolved in spec.md `## Clarifications` (Session
2026-06-07) before this plan was written.
