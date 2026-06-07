# Feature Specification: Recurring Agenda Items

**Feature Branch**: `002-agenda-recurrence`
**Created**: 2026-06-07
**Status**: Draft
**Input**: User description: "For the next feature, I would like the child to be able to add
agenda items for multiple days in the future up to a date of choice. Recurrence is per
agenda item. A child is only able to add recurrence after adding an agenda item for the
specific time block. Refer to mock2.jpg for 'Add Recurrence' button placement. When adding
recurrence, the child will be presented with the following fields: Recurrence Type
(Daily / Weekly, Every <current day I am adding to>) and Up-to-Date (YYYY-MM-DD,
must be future, must be valid, inclusive). If the future time slot already contains an
agenda item, it will be overwritten."

> **A note on language.** Throughout this spec, the user-facing labels shown to the child
> use kid-friendly wording (**Repeat**, **How often?**, **Until**, **Every day**, **Every
> Sunday**). When the spec discusses "Daily" or "Weekly" recurrence in narrative or
> requirement text, those are developer-facing concept names — they are not what the
> child sees on screen. See **FR-017** for the voice requirement.

## Clarifications

### Session 2026-06-07

- Q: Re-applying recurrence with a shorter Until — what happens to the entries created by the earlier application that now fall past the new Until? → A: Keep them. Entries created by an earlier run are independent copies (per FR-015) and remain in place; they are not auto-deleted. The child clears them individually if they want them removed.
- Q: When the fan-out fails part-way through (e.g., DB error on entry #N), should partial writes be kept? → A: No. The fan-out is atomic — all-or-nothing. If any write fails, none of this application's entries are persisted and the source block is unchanged. The child sees one kid-friendly retry message.
- Q: What UX surface should the Repeat picker use? → A: A popover anchored to the source agenda row, displaying How often?, Until, and Confirm/Cancel. The popover behaves modally — all other dashboard controls are blocked while it is open and the child must Confirm or Cancel to dismiss it (backdrop click and ESC both act as Cancel, matching feature 001's existing modal conventions).
- Q: What does the child see while the fan-out is being written? → A: The popover stays open with Confirm and Cancel disabled and a **wand-themed** busy indicator (e.g., a small rotating 🪄/✨ icon matching feature 001's ocean/princess theme) shown where the buttons were. The popover only closes on success; on failure, the busy indicator is replaced with the kid-friendly retry message and Confirm/Cancel are re-enabled. ESC and backdrop click are ignored during the busy state.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apply a daily recurrence to an agenda item (Priority: P1)

A child has planned an hour of their day (e.g., "Math homework" at 09:00–10:00 today) and
wants the same activity to appear every day at the same hour through to a chosen future
date, without having to re-enter it on each day. The child opens the row, picks the
**Repeat** affordance, chooses **Every day**, enters an **Until** date, and confirms — the
activity is populated into every day from tomorrow up to and including the chosen end
date.

**Why this priority**: This is the most common use of recurrence — daily routines (homework,
practice, getting ready for bed). On its own it removes 90% of the repetitive typing the
feature targets and is a viable, shippable slice.

**Independent Test**: From a fresh dashboard, enter an activity in one hour-block, apply
Daily recurrence with a future **Until** date, then navigate the calendar to each day in
the range and confirm the activity is present at the same hour. Past dates, the source
day's other hours, and dates after the chosen end date are unchanged.

**Acceptance Scenarios**:

1. **Given** today is 2026-06-07 (Sunday) and the child has entered "Math homework" in the
   09:00–10:00 block on today's agenda, **When** the child opens **Repeat**, picks
   **Every day**, enters **Until** `2026-06-10`, and confirms, **Then** the 09:00–10:00
   block on 2026-06-08, 2026-06-09, and 2026-06-10 each shows "Math homework" and no
   other blocks or dates are affected.
2. **Given** the source block is "Math homework" at 09:00–10:00 on 2026-06-07 and the
   09:00–10:00 block on 2026-06-09 already contains a different activity, **When** Daily
   recurrence is applied through 2026-06-10, **Then** the 2026-06-09 block is overwritten
   with "Math homework".
3. **Given** the child applies Daily recurrence with **Until** `2026-06-10`, **When** the
   child later edits the 2026-06-09 copy to "Reading", **Then** the source on 2026-06-07
   and the copies on 2026-06-08 and 2026-06-10 are unchanged.

---

### User Story 2 - Apply a weekly recurrence to an agenda item (Priority: P2)

A child has a weekly routine (e.g., swimming lessons every Wednesday) and wants the
activity to appear only on the matching weekday until a chosen end date — not on every
day in between. The child picks the weekly option labelled **Every &lt;day-of-week of the
source block&gt;** and an **Until** date; the activity is populated only on dates that
share the source's day-of-week, up to and including the end date.

**Why this priority**: Weekly is a common pattern but slightly less universal than Daily;
it strengthens the feature for routines like lessons and clubs. P2 because the Daily case
already provides shippable value on its own.

**Independent Test**: Enter an activity on a known weekday, apply Weekly recurrence with
a future **Until** date, navigate to each subsequent matching weekday in the range and
confirm the activity appears; confirm intervening weekdays are untouched.

**Acceptance Scenarios**:

1. **Given** today is 2026-06-07 (Sunday) and the child has entered "Family lunch" at
   12:00–13:00, **When** the child opens **Repeat**, the weekly option label reads
   **"Every Sunday"**.
2. **Given** the source block "Family lunch" is on Sunday 2026-06-07 at 12:00–13:00,
   **When** the child picks **Every Sunday** with **Until** `2026-06-28`, **Then** the
   12:00–13:00 block on 2026-06-14, 2026-06-21, and 2026-06-28 each shows "Family lunch"
   and weekday agendas (Mon–Sat) between those dates are unchanged.
3. **Given** the same source on Sunday 2026-06-07, **When** the child picks **Every
   Sunday** with **Until** `2026-06-13` (no further Sundays fall in range), **Then** no
   future entries are created and the source on 2026-06-07 is unchanged.

---

### User Story 3 - Input guidance and friendly validation (Priority: P2)

A child entering a date for **Until** is guided by tooltip text in the expected format,
and is blocked from submitting nonsense or non-future dates with **friendly, encouraging
feedback** they can read and act on themselves, so they cannot accidentally create
rubbish data or schedule into the past.

**Why this priority**: Input validation prevents bad data and confusion, and is required
for either US1 or US2 to be safely usable. Bundled at P2 because it can be partially
covered by basic browser validation while US1 ships, but a quality implementation needs
the explicit rules and the kid-friendly tone.

**Independent Test**: From a row that has an activity, open **Repeat**. With **Until**
blank, confirm a tooltip in the format `YYYY-MM-DD` is shown. Enter each of: a malformed
date, a non-existent date (e.g., `2026-02-30`), a past date, today's date, the source
date, and a date more than 90 days after today — confirm each is rejected with a clear
kid-friendly message. Then enter a valid date and confirm acceptance.

**Acceptance Scenarios**:

1. **Given** the **Until** field is empty, **When** the child focuses it, **Then** a
   tooltip showing the format `YYYY-MM-DD` is displayed (e.g., "Pick a day like
   2026-06-10").
2. **Given** **Until** is `2026-02-30`, **When** the child confirms, **Then** the entry
   is rejected with a kid-friendly message that this day isn't on the calendar, and no
   future entries are created.
3. **Given** **Until** is `2026-06-07` and the source is also on 2026-06-07, **When** the
   child confirms, **Then** the entry is rejected with a kid-friendly message asking the
   child to pick a day that hasn't happened yet, and no entries are created.
4. **Given** **Until** is `2025-12-01` (past), **When** the child confirms, **Then** the
   entry is rejected with a kid-friendly message asking the child to pick a day in the
   future.
5. **Given** today is 2026-06-07 and **Until** is `2026-10-01` (more than 90 days after
   today), **When** the child confirms, **Then** the entry is rejected with a
   kid-friendly message asking the child to pick a day within the next 90 days, and no
   entries are created.

---

### Edge Cases

- **Source block is elapsed** (today's hour has already passed): the **Repeat** affordance
  MUST NOT be available — consistent with feature 001's elapsed-block lock (FR-011/012).
- **Source block is empty**: the **Repeat** affordance MUST NOT be available — recurrence
  is "per agenda item" and there is no item to repeat.
- **Until equals the source date**: rejected (must be strictly in the future relative to
  the source).
- **Until is far in the future** (e.g., 2099-01-01): rejected. **Until** is capped at
  **90 days after the child's current local date** — values beyond that bound the Daily
  fan-out to at most 90 entries and keep the planning horizon age-appropriate.
- **Weekly recurrence with no matching weekday in range** (e.g., source is Sunday, end
  date is 5 days later): zero copies are created; this is not an error.
- **Child edits or deletes the source after recurrence is applied**: future copies remain
  unchanged (each is independent).
- **Child applies recurrence to a block that itself was created by an earlier recurrence**:
  treated identically to any other source block — generates a fresh series of independent
  copies; the earlier "series" relationship does not exist (entries are not linked).
- **Re-applying recurrence with a shorter Until** (Clarification Q1): when the child
  re-applies recurrence to the same source with an earlier **Until**, entries between the
  new **Until** and the previous **Until** are **NOT** deleted — they remain as
  independent copies. Overlapping dates within the new range are still overwritten as
  per FR-013. The child can clear unwanted entries individually using the existing
  agenda editing controls.
- **Fan-out fails part-way through** (Clarification Q2): no entries from the failed
  application are kept and the source block is unchanged (atomic — see FR-018). The
  child sees one kid-friendly retry message (e.g., "Hmm, something went wrong — let's
  try that again!").
- **Child tries to use any other control while the Repeat popover is open**
  (Clarification Q3): the control is non-interactive — calendar dates, other agenda rows,
  the star, wants, settings, and logout are all blocked until the child Confirms or
  Cancels. Backdrop click and Escape both act as Cancel.
- **Child double-clicks Confirm** (Clarification Q4): the Confirm button is disabled the
  moment the write begins (FR-022), so a second click has no effect — exactly one
  application of recurrence occurs per Confirm.
- **Two browsers open on the same child**: the second browser does not see the new
  entries until it refreshes or navigates to the affected dates (consistent with the
  existing client-cache behaviour for agenda).
- **Daylight saving boundary** within the date range: dates are calendar dates only
  (`YYYY-MM-DD`); time is the local hour label. No special handling required.

## Requirements *(mandatory)*

### Functional Requirements

**Affordance & gating**

- **FR-001**: The system MUST display a **Repeat** affordance on each agenda block that
  has an activity and is not elapsed. The affordance MUST use the recurrence icon (↻)
  described in [assets/recurrence-affordance.md](assets/recurrence-affordance.md).
- **FR-002**: The **Repeat** affordance MUST NOT be available on empty agenda blocks or
  on blocks whose hour has elapsed on a past or current date.
- **FR-003**: Activating **Repeat** MUST present two input fields labelled
  **"How often?"** and **"Until"**.

**Recurrence Type ("How often?")**

- **FR-004**: The **How often?** field MUST offer exactly two options labelled
  **"Every day"** and **"Every &lt;day-of-week of the source block&gt;"** (e.g., "Every
  Sunday" when the source block is on a Sunday).
- **FR-005**: The "Every &lt;day-of-week&gt;" option label MUST always reflect the
  day-of-week of the **source block's date**, not today's date.

**Until input**

- **FR-006**: The **Until** input MUST accept dates in the format `YYYY-MM-DD`.
- **FR-007**: When the **Until** input is blank, the system MUST display tooltip text
  showing the format `YYYY-MM-DD` in a kid-friendly form (e.g., "Pick a day like
  2026-06-10").
- **FR-008**: The system MUST reject **Until** values that are not a valid calendar date
  (e.g., `2026-02-30`, `2026-13-01`, malformed strings) with a clear kid-friendly message
  and MUST NOT create any entries.
- **FR-009**: The system MUST reject **Until** values that are not strictly after the
  source block's date with a clear kid-friendly message and MUST NOT create any entries.
- **FR-009A**: The system MUST reject **Until** values more than **90 days after the
  child's current local date** with a clear kid-friendly message and MUST NOT create any
  entries. (The 90-day cap is inclusive: today + 90 days is the maximum accepted value.)
- **FR-010**: **Until** MUST be treated as **inclusive** — the chosen date itself is part
  of the range.

**Recurrence application**

- **FR-011**: For **Daily** recurrence (the **Every day** option), the system MUST create
  an agenda entry with the source's activity at the source's hour on every date from
  (source date + 1 day) through **Until** inclusive.
- **FR-012**: For **Weekly** recurrence (the **Every &lt;day-of-week&gt;** option), the
  system MUST create an agenda entry with the source's activity at the source's hour on
  every date in the range (source date + 7 days) through **Until** inclusive whose
  day-of-week matches the source block.
- **FR-013**: If a target date/hour slot already contains an agenda entry, the system
  MUST overwrite it with the source's activity.
- **FR-014**: The system MUST NOT modify the source block or any date/hour slot at or
  before the source block's date.
- **FR-015**: Generated entries MUST be independent of the source after creation —
  subsequent edits or deletion of the source block MUST NOT change generated entries, and
  edits to one generated entry MUST NOT affect any other generated entry.
- **FR-016**: After recurrence is applied successfully, the system MUST close the
  **Repeat** popover and the child MUST be able to navigate to the affected dates and see
  the populated entries within the existing date-switch performance budget.
- **FR-018**: The fan-out write MUST be **atomic** — all generated entries either succeed
  together or none are written (Clarification Q2). If any failure occurs mid-write, the
  system MUST NOT persist any entries from this application, MUST leave the source
  block unchanged, and MUST show the child a single kid-friendly retry message (per
  FR-017 voice rules).

**Picker surface (Clarification Q3)**

- **FR-019**: The **Repeat** input MUST render as a **popover anchored to the source
  agenda row**, containing the **How often?** field, the **Until** field, and explicit
  **Confirm** and **Cancel** actions.
- **FR-020**: While the popover is open, all other dashboard interactions MUST be blocked
  — calendar navigation, agenda editing on other rows, star toggle, wallet, wants/rewards
  controls, settings, and logout. The child MUST Confirm or Cancel to dismiss the popover.
- **FR-021**: **Cancel** MUST close the popover without writing any entries and leave the
  source block unchanged. Pressing **Escape** and clicking the modal backdrop MUST behave
  as **Cancel** — consistent with feature 001's existing settings/logout modals — except
  during the busy state described in FR-022.

**In-progress feedback (Clarification Q4)**

- **FR-022**: While the fan-out write is in flight, the **Repeat** popover MUST remain
  open with both **Confirm** and **Cancel** disabled and a **wand-themed busy indicator**
  (a small rotating wand 🪄 / sparkle ✨ visual aligned with feature 001's ocean/princess
  theme — see project constitution Principle IV) shown in place of the action buttons.
  Escape and backdrop click MUST be ignored during this state.
- **FR-023**: The popover MUST NOT close until the write resolves. On success the popover
  closes per FR-016. On failure the busy indicator MUST be replaced with the kid-friendly
  retry message (per FR-017 / FR-018) and Confirm/Cancel re-enabled so the child can
  retry or back out.

**Child-friendly voice (NEW)**

- **FR-017**: All user-facing text introduced by this feature — button labels, field
  labels, tooltips, helper text, and error messages — MUST follow feature 001's
  **Principle IV (Child-First UX)** voice:
  - **Short, simple words** that a primary-school child can read on their own.
  - **No technical jargon**: avoid words like "recurrence", "validate", "invalid",
    "horizon", "fan-out", "submit", "cancel". Prefer plain alternatives (e.g., "repeat",
    "check", "pick another day", "stop on").
  - **Encouraging, not stern**: error messages frame mistakes as small, fixable nudges
    (e.g., "Hmm, that day isn't on the calendar — try another one!"), not as failures or
    warnings.
  - **Direct and second-person**: address the child ("you", "your") and tell them what
    to do next, not what went wrong in passive voice.
  - **Consistency with existing copy**: tone matches the auth, settings, and agenda
    components already in [frontend/js/components/](frontend/js/components/) (e.g.,
    "Let me in", "Stay logged in", "Click to change your name").

### Key Entities *(include if feature involves data)*

- **Agenda entry** (existing): a single (date, hour, activity) for a child. Recurrence
  produces additional independent agenda entries; no new entity is introduced.
- **Recurrence request** (transient): the in-flight choice the child makes — the
  **How often?** selection plus the **Until** date — applied as a one-time fan-out. Not
  persisted as its own entity once the entries are written.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A child can apply Daily recurrence to a chosen agenda item and have all
  expected days populated within **2 seconds** of confirming.
- **SC-002**: A child can apply Weekly recurrence to a chosen agenda item and have all
  expected matching-weekday dates populated within **2 seconds** of confirming.
- **SC-003**: Invalid **Until** inputs (malformed, non-existent date, equal to source
  date, in the past, or more than 90 days after today) are rejected with a clear,
  kid-friendly in-form message in **under 200 ms** of the confirm action, and no entries
  are created in any of these cases.
- **SC-004**: Every agenda row that has an activity and is not elapsed exposes the
  **Repeat** affordance — verified by 100% coverage across all 14 hour-blocks on a
  sample date.
- **SC-005**: For each user story (US1, US2), the end-to-end "enter activity → apply
  recurrence → verify on a target date" flow takes the child **no more than 4 distinct
  interactions** (open **Repeat**, pick the **How often?** option, enter the **Until**
  date, confirm) — measured as the count of click/keystroke groups in the recorded flow.
- **SC-006**: When the child re-applies recurrence to the same source with a different
  **Until**: (a) the overlapping date range shows the latest activity, (b) if the new
  **Until** is later than the previous one, the tail is extended with new entries, and
  (c) if the new **Until** is earlier than the previous one, entries created by the
  earlier run that fall past the new **Until** remain untouched (per Clarification Q1).
  Verifiable by inspecting the agenda on each affected date.
- **SC-007** (new): Every user-facing label, tooltip, and error message introduced by
  this feature passes a readability check at or below a **primary-school reading level**
  (≤ Grade 4 / ages 9–10), measured by a standard readability score (e.g.,
  Flesch–Kincaid ≤ 4) on the collected on-screen copy.
- **SC-008** (new): A simulated failure injected at any single write within the fan-out
  results in **zero** new agenda entries on every target date AND an unchanged source
  block — measured by an integration test that injects a database error at write #N for
  multiple values of N across the range, verified by inspecting the database after each
  failure injection (100% pass rate).

## Assumptions

- **Source block must not be elapsed.** The **Repeat** affordance is only available on
  hour-blocks that are still editable under feature 001's existing rules (today's
  not-yet-elapsed hours, or any future date). Past-date and elapsed-today source blocks
  remain read-only.
- **Independent copies, not a linked series.** When recurrence is applied, the system
  writes N independent agenda entries. There is no persisted "series" linking them.
  Editing, deleting, or re-applying recurrence on the source has no effect on previously
  generated copies.
- **Overwrite is unconditional.** When a target slot already has an entry, it is replaced
  without prompting. The child is presumed to want the new activity in that slot since
  they are explicitly applying recurrence.
- **Recurrence does not affect stars, wallet, or wants** — it is scoped to agenda entries.
- **Day-of-week label is derived from the source date** using the child's local calendar.
- **The browser local clock remains the source of truth** for "today", "future", and
  "elapsed" decisions, consistent with feature 001.
- **Stars are not auto-marked** on the recurrence end date or on any generated copy — only
  agenda entries are populated.
- **No yearly, monthly, or custom-interval recurrence in scope.** Only Daily and Weekly,
  as explicitly listed.
- **No "remove recurrence" action in scope.** Because generated entries are independent
  copies, a child who wants to undo a series clears each entry individually using the
  existing agenda editing controls.
- **90-day Until cap** (resolved clarification). **Until** may be no more than 90 days
  after the child's current local date. Daily series therefore generate ≤ 90 future
  entries and Weekly series ≤ 13. The cap is measured against "today" (not the source
  block's date) so it shifts with the calendar and the child cannot accidentally schedule
  far into the future.
- **Child-friendly voice across all user-facing text** (resolved clarification). All
  labels, tooltips, helper text, and error messages introduced by this feature align
  with the project constitution's **Principle IV — Child-First User Experience** and
  match the tone already established in feature 001's auth, settings, and agenda
  components. See **FR-017** for the rule and **SC-007** for the measurable check.
