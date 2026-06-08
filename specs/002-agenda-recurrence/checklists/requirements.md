# Specification Quality Checklist: Recurring Agenda Items

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-06-07
**Last Updated**: 2026-06-07
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Resolved Clarifications

### Q1 — Up-to-Date maximum horizon (resolved 2026-06-07)

**Question**: Is there a maximum allowed Up-to-Date, measured from today?

**Resolution**: **Cap at 90 days after the child's current local date.**

**Where it's encoded in spec.md**:

- Edge Cases: bullet describing "Until is far in the future" rewritten with the cap.
- **FR-009A**: hard rule rejecting **Until** > today + 90 days.
- US3 Acceptance Scenario 5: rejection case for an over-90-days input.
- **SC-003**: extended to include the cap in invalid-input rejection.
- Assumptions: bullet documenting the cap and its rationale (≤ 90 Daily / ≤ 13 Weekly
  entries per series; measured against "today", not the source date).

### Q2 — Child-friendly voice for all user-facing text (added 2026-06-07)

**Request**: "Ensure the text and instructions used are primary school children friendly."

**Resolution**: **All user-facing labels, helper text, tooltips, and error messages
introduced by this feature follow feature 001's Principle IV (Child-First UX) voice.**

**Where it's encoded in spec.md**:

- **Pre-amble note** below the Input quote explaining that "Daily"/"Weekly" are
  developer-facing concept names, while on-screen labels are kid-friendly.
- All quoted UI labels renamed:
  - "Add Recurrence" button → **Repeat**
  - "Recurrence Type" field → **How often?**
  - "Up-to-Date" field → **Until**
  - "Daily" option → **Every day**
  - "Weekly, Every Sunday" option → **Every Sunday** (day-of-week always reflects the
    source block's date)
- **FR-017** (new) codifies the voice rule: short simple words, no jargon, encouraging
  not stern, second-person, consistent with existing components.
- **SC-007** (new) makes it measurable: Flesch–Kincaid ≤ 4 across collected on-screen
  copy.
- All US1/US2/US3 acceptance scenarios, edge cases, and FRs updated to use the new
  labels.
- Assumptions: bullet cross-referencing Principle IV and existing component tone.

### Q3 — Negative-action button label (resolved 2026-06-08, via `/speckit-analyze` finding I1)

**Issue**: The original spec mandated a "Cancel" action button in FR-021 while FR-017's
no-jargon list explicitly listed "cancel" as a word to avoid — internal contradiction.

**Resolution**: **The negative-action button (close-without-applying) is labelled
"Not now"** — short, encouraging, second-person-friendly, and absent from FR-017's
jargon list. Backdrop click and Escape also act as **Not now**.

**Where it's encoded in spec.md and siblings**:

- **FR-019** — picker actions are **Confirm** and **Not now**.
- **FR-020** — "the child MUST press **Confirm** or **Not now** to dismiss the popover".
- **FR-021** — "**Not now** MUST close the popover…"; ESC + backdrop click both behave
  as **Not now**.
- **FR-022 / FR-023** — busy state disables **Confirm** + **Not now**; failure re-enables
  both.
- Edge case bullet for "Child tries to use any other control while the Repeat popover is
  open" — updated to **Not now**.
- [tasks.md](../tasks.md) **T010 / T016 / T019** — popover skeleton, Confirm handler, and
  modality task all reference **Not now**.
- [quickstart.md](../quickstart.md) smoke-test step 6 — describes ESC / backdrop as
  acting as **Not now**.
- [research.md](../research.md) §4 and §5 — narrative updated to **Not now**.
- **Historical record kept verbatim**: the `## Clarifications` Session 2026-06-07 bullets
  for Q3 and Q4 in spec.md still say "Cancel" because they are an audit of what was asked
  and answered at that point in time. This is intentional and not a contradiction with
  the FR text.

### Q6 — Full 14-block iteration in T013 (resolved 2026-06-08, via Round-2 `/speckit-analyze` finding G3)

**Issue**: SC-004 mandates "100% coverage across **all 14 hour-blocks** on a sample date",
but the Round-1 fix (Q4 / G2) only filled the 9 non-elapsed blocks (12:00–20:00) and
asserted the ↻ icon was present on each. It did not test the elapsed rows (5 blocks) nor
the empty-non-elapsed case — strictly only 9 of 14 positions and only one of the three
gating conditions were exercised.

**Resolution**: **T013 now iterates all 14 hour positions (07:00–20:00) and exercises all
three gating conditions of FR-001/FR-002**:

- **(a) Elapsed (07:00–11:00, 5 blocks)** → assert ↻ icon absent regardless of content.
- **(b) Non-elapsed + filled (12:00–20:00, 9 blocks)** → fill each and assert ↻ icon
  present.
- **(c) Non-elapsed + empty** → clear one block from (b) (e.g., 14:00) and assert the
  icon disappears.

These three short steps together touch every hour position and every gating branch — the
letter (14/14) and the spirit (all three conditions) of SC-004 are now both satisfied.

### Q5 — Popover heading required for ARIA pattern (resolved 2026-06-08, via Round-2 `/speckit-analyze` finding I3)

**Issue**: T029 mandated `aria-labelledby` on the popover wrapper pointing at "the popover
heading", but T010's skeleton did not render a heading element — the ARIA target did not
exist.

**Resolution**: **T010 now renders `<h2 id="repeat-popover-title">Repeat ✨</h2>` at the
top of the popover** (kid-friendly per FR-017 voice). T029's `aria-labelledby` is pinned
to `"repeat-popover-title"` to match. The heading doubles as a visible title for sighted
children and as the screen-reader announcement target for assistive tech.

### Q4 — `/speckit-analyze` MEDIUM/LOW findings (resolved 2026-06-08)

The post-`/speckit-tasks` analysis pass surfaced 8 additional findings beyond I1. Each is
resolved below; the spec/plan/tasks are now consistent.

| Finding | Severity | Resolution |
| --- | --- | --- |
| **U1** — native `<input type="date">` shows locale format ("06/10/2026") but FR-007 mandated a `YYYY-MM-DD` tooltip → confusing for the child | MEDIUM | spec.md **FR-006** rewritten: input MUST present a native date picker, JS value MUST be YYYY-MM-DD, displayed format inside the picker is locale-dependent and acceptable. **FR-007** rewritten: blank-state hint is now kid-friendly (e.g. "Tap to pick a day"), no literal format string shown. **US3 AC1** updated accordingly. tasks.md **T017** + **T027** updated; T025 (validation E2E) clarified that the format-failure cases drive the input via direct DOM value override since the native picker prevents typing. |
| **G1** — SC-001/002/003 timing budgets had no test assertions | MEDIUM | tasks.md **T013** (Daily E2E) asserts `elapsed < 2000 ms` per SC-001; **T022** (Weekly E2E) asserts `< 2000 ms` per SC-002; **T025** (Validation E2E) asserts `< 200 ms` per SC-003. All use `performance.now()` around the Confirm click. |
| **G2** — SC-004 "100% coverage across 14 hour-blocks" only spot-checked one row | MEDIUM | tasks.md **T013** extended to fill every non-elapsed hour-block on the sample date (12:00–21:00) and assert the ↻ icon appears on each — directly verifies SC-004. |
| **A1** — FR-022 "small" wand visual was qualitative | LOW | tasks.md **T008** pins concrete values: 🪄 at `font-size: 28px`, flanking ✨ at `font-size: 18px`, rotation 1.4 s/turn, opacity-pulse keyframe, plus `prefers-reduced-motion: reduce` honoured. |
| **A2** — SC-007 "Flesch–Kincaid ≤ 4" was ambiguous (Grade Level vs Reading Ease) | LOW | spec.md **SC-007** now says **Flesch–Kincaid Grade Level** explicitly, with a parenthetical noting the Reading Ease variant is *not* what's meant. tasks.md **T028** mirrors the wording. |
| **U2** — T029 ARIA labels only enumerated the ↻ icon | LOW | tasks.md **T029** now enumerates labels for the ↻ icon, the **Confirm** button, the **Not now** button, the **How often?** radio group, each radio option, and the **Until** date input, plus role/aria-modal/aria-labelledby on the popover wrapper. |
| **U3** — T004 declared an unused `agendaService` dependency | LOW | tasks.md **T004** signature tightened to `createRecurrenceService(db, timeLib)` per research.md §2 (raw prepared statements, no agendaService wrapper). **T005** updated to match. |
| **I2** — plan.md Summary said "~2 new frontend modules" but actually one new module + edits | LOW | plan.md Summary tightened: "1 new endpoint, 1 new backend service module, 1 new frontend component module (plus edits to agenda.js, api.js, styles.css), 4 new test files". |

## Notes

- All checklist items pass. The spec is ready for `/speckit-plan` (or `/speckit-clarify`
  if you want a second pass for anything subtle the checklist did not flag).
- All six resolved clarifications (Q1, Q2, Q3, Q4, Q5, Q6) have been encoded across
  multiple sections so the intent cannot be lost during planning or implementation.
