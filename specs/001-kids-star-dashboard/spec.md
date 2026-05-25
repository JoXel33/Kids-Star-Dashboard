# Feature Specification: Kids Star Dashboard — Daily Planner & Star Reward System

**Feature Branch**: `001-kids-star-dashboard`
**Created**: 2026-05-23
**Status**: Draft
**Input**: User description: "I would like a dashboard on browser for primary school children to journal/plan their days. There is also an element of reward and spending here using Stars. Each day, the child can earn a star. Stars are a unit of currency for the child to exchange with Rewards. The dashboard should contain six sections: (1) Greeting depending on time of day plus child name and today's date; (2) Calendar / date selector with the current day highlighted by default; (3) Agenda for the day — a 7am–9pm schedule in 1-hour blocks, 4 hours visible at once and scrollable, elapsed hours read-only and marked elapsed, upcoming hours editable, blocks shown for the selected date; (4) Today's Star — a toggle defaulting to off, only today's star editable, other dates read-only, a Yes after 9pm increases Stars Collected by 1; (5) Star Wallet — Stars Collected (lifetime) and Star Balance (Collected minus Spent), real-time and unaffected by date selection; (6) Your Rewards — up to three Wants each with a description and a cost of 1–5 stars, redeemable only when the Star Balance is sufficient, redeeming removes the Want and increases Stars Spent, non-redeemed Wants removable, add allowed when fewer than 3, real-time and unaffected by date selection. Layout should follow the attached mock and the sections must fit one standard browser page; background and theme should look like the attached princess_ocean_dashboard.html."

## Clarifications

### Session 2026-05-23

- Q: How should the child's data be stored, and who uses the dashboard? → A: One child, with data synced across devices and browsers via shared remote storage (requires a backend and a means of identifying the child).
- Q: What identification method should the child use to access their data across devices? → A: A simple, memorable access code created on first use; entering it on any device loads that child's data. No email or password.
- Q: After 9 PM, can "Today's Star" still be toggled? → A: At 21:30 the star locks (becomes read-only); the status shown at 21:30 is final and is counted toward Stars Collected if Yes.
- Q: On the current day, is the in-progress hour block editable? → A: Yes — a block becomes elapsed (read-only) only once the clock passes its end time, so the in-progress hour stays editable.
- Q: What happens if the child forgets their access code? → A: Recovery via a memorable question set at first use; the question is "What is the name of your school?".

### Session 2026-05-25

- Q: When the child cannot yet afford a Want, should the redeem control be hidden or disabled? → A: Amendment to FR-028 — the redeem button is shown at all times next to each Want; it is disabled (with a tooltip explaining why) when the balance is insufficient and enabled when affordable. The underlying rule (redeem only when balance ≥ cost) is unchanged and still enforced by the backend.
- Q: How does the child enter edit mode for an upcoming hour block? → A: Clicking/tapping the activity area itself opens an inline editor. (No separate Edit button required.)


## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan and journal the daily agenda (Priority: P1)

A primary-school child opens the dashboard and is greeted by name with a time-appropriate
message and today's date. They see a calendar with today highlighted and an hourly agenda
for the day. They write what they plan to do in upcoming hour blocks and save it, and they
can move through the calendar to review what they did on past days or plan ahead for future
days.

**Why this priority**: The daily planning/journaling experience is the core purpose of the
product. On its own — even without stars or rewards — it delivers a complete, usable daily
planner for a child.

**Independent Test**: Open the dashboard, confirm the greeting / date / calendar render with
today selected, enter and save an activity for an upcoming hour, navigate to another date and
back, and confirm the saved activity persists and elapsed hours cannot be edited.

**Acceptance Scenarios**:

1. **Given** the dashboard is opened, **When** it loads, **Then** the greeting shows a
   time-of-day phrase ("Good Morning / Afternoon / Evening") with the child's name, today's
   date is displayed, and the calendar highlights and selects the current day.
2. **Given** today is the selected date, **When** the child views the agenda, **Then** exactly
   4 one-hour blocks are visible at a time and the child can scroll through all blocks covering
   07:00–21:00.
3. **Given** an upcoming hour block on the selected date, **When** the child enters activity
   text and saves it, **Then** the activity is stored and displayed for that block.
4. **Given** an elapsed hour block, **When** the child views it, **Then** it is visibly marked
   as elapsed and provides no way to edit its activity.
5. **Given** the child selects a past date, **When** the agenda loads, **Then** it shows that
   date's saved activities with every hour block read-only.
6. **Given** the child selects a future date, **When** the agenda loads, **Then** every hour
   block is editable and planned activities can be saved.
7. **Given** activities were saved earlier, **When** the child closes and reopens the
   dashboard, **Then** the saved activities are still present for their dates.

---

### User Story 2 - Earn and track stars (Priority: P2)

At the end of a good day, the child turns on "Today's Star" to record that they earned a star.
The Star Wallet shows how many stars they have collected over time and their current balance.
When the child looks back at past dates, they can see whether a star was earned that day, but
cannot change it.

**Why this priority**: Earning and tracking stars adds the motivational reward layer on top of
the planner. It depends on the dashboard shell from US1 but delivers standalone value: a
visible record of good days and a running star total.

**Independent Test**: With today selected, toggle the star on and confirm it shows earned;
navigate to a past date and confirm its star status is shown read-only; confirm the Star
Wallet shows Stars Collected and Star Balance and that these do not change when a different
date is selected.

**Acceptance Scenarios**:

1. **Given** today is selected and the star defaults to off, **When** the child toggles
   "Today's Star" on, **Then** the star shows as earned for today.
2. **Given** a date other than today is selected, **When** the child views the Today's Star
   section, **Then** that date's star status (Star / No Star) is shown read-only and cannot be
   toggled.
3. **Given** today's star is set to Yes, **When** the current day reaches 21:30, **Then** the
   star locks as read-only and Stars Collected includes that star.
4. **Given** the child has collected stars and spent none, **When** viewing the Star Wallet,
   **Then** Star Balance equals Stars Collected.
5. **Given** a non-today date is selected, **When** viewing the Star Wallet, **Then** Stars
   Collected and Star Balance are identical to their values when today is selected.

---

### User Story 3 - Maintain and redeem rewards (Priority: P3)

The child keeps a short wish list of up to three "Wants", each with a description and a star
cost. When they have enough stars in their balance, they can redeem a Want; the Want is then
removed and the cost is deducted from their balance. They can also remove Wants they no longer
wish for and add new ones whenever there is a free slot.

**Why this priority**: Redeeming rewards is the "spending" half of the star economy and
completes the earn-and-spend loop. It depends on the Star Wallet from US2 but is a
self-contained slice: managing a wish list and exchanging stars for rewards.

**Independent Test**: Add a Want with a description and a cost of 1–5 stars; redeem it when the
balance is sufficient and confirm it is removed and Stars Spent / Star Balance update; confirm
no redeem option appears when the balance is insufficient; confirm a non-redeemed Want can be
removed; confirm no 4th Want can be added.

**Acceptance Scenarios**:

1. **Given** fewer than 3 Wants exist, **When** the child adds a Want with a description and a
   cost between 1 and 5 stars, **Then** it appears in the rewards list.
2. **Given** 3 Wants already exist, **When** the child views the rewards section, **Then** no
   option to add another Want is available.
3. **Given** a Want whose cost is less than or equal to the Star Balance, **When** the child
   redeems it, **Then** the Want is removed, Stars Spent increases by the Want's cost, and Star
   Balance decreases by the same amount.
4. **Given** a Want whose cost is greater than the Star Balance, **When** the child views that
   Want, **Then** the redeem control for that Want is shown but disabled, with a tooltip
   explaining why.
5. **Given** a Want that has not been redeemed, **When** the child removes it, **Then** it
   disappears from the list and Stars Spent is unchanged.
6. **Given** a date other than today is selected, **When** the child views the rewards section,
   **Then** the Wants list is unchanged.

---

### Edge Cases

- What happens when the clock crosses midnight while the dashboard is open? The
  highlighted "today" advances to the new date, the previous day's agenda and star become
  read-only, and a fresh star (default off) applies to the new day.
- What happens when the clock crosses 21:30 while the dashboard is open? Today's star locks
  (becomes read-only), and if it is Yes, Stars Collected reflects the newly counted star.
- How is the hour block currently in progress treated? It remains editable until its end time
  passes; it becomes elapsed / read-only only once the clock moves past the block's end.
- What happens when the child navigates to a date before the dashboard was first used? The
  agenda is empty, the star shows "No Star", and both are read-only.
- What happens when the child navigates far into the future? The agenda is empty and fully
  editable; the star shows "No Star" and is read-only (only today's star is editable).
- What happens when the child tries to redeem a Want they cannot afford? The redeem button is
  shown for that Want but is disabled, preventing the action; a tooltip explains it is too
  expensive. The backend additionally rejects any attempt with `insufficient_balance`.
- What happens when a Want's cost is higher than the balance at creation time? The Want can
  still be added and kept; it simply remains non-redeemable until the balance is sufficient.
- What happens on first ever use (no saved data)? Stars Collected and Stars Spent are 0, the
  rewards list is empty, and the child can set their name.
- What happens if the child forgets their access code? They can recover access by correctly
  answering the recovery question "What is the name of your school?".
- What happens if the child has not set a name? The greeting still displays gracefully without
  a name.

## Requirements *(mandatory)*

### Functional Requirements

#### Greeting & Date

- **FR-001**: System MUST display a greeting whose wording depends on the current local time
  of day — "Good Morning" from 00:00 to 11:59, "Good Afternoon" from 12:00 to 16:59, and
  "Good Evening" from 17:00 to 23:59.
- **FR-002**: System MUST display the child's name as part of the greeting.
- **FR-003**: System MUST allow the child to set and change their name, and MUST retain the
  name across sessions.
- **FR-004**: System MUST display the current calendar date ("Today's Date"), which MUST
  always reflect the real current date regardless of which date is selected in the calendar.

#### Calendar / Date Selector

- **FR-005**: System MUST provide a calendar / date selector that lets the child navigate to
  past and future dates.
- **FR-006**: System MUST highlight the current day by default and have it selected when the
  dashboard loads.
- **FR-007**: When the child selects a date, the Agenda and the Today's Star status display
  MUST update to show that date; the greeting, Today's Date, Star Wallet, and Rewards list
  MUST NOT be affected by date selection.

#### Agenda

- **FR-008**: System MUST present a daily agenda as consecutive one-hour blocks covering 07:00
  to 21:00 (14 blocks).
- **FR-009**: The agenda MUST display 4 hour blocks at a time and allow the child to scroll to
  earlier (elapsed) and later (upcoming) blocks.
- **FR-010**: System MUST allow the child to enter and save activity text for any hour block
  that is not elapsed on the selected date.
- **FR-011**: System MUST treat an hour block as "elapsed" once the current time has passed
  that block's end time on the current date; for any past date, all blocks MUST be treated as
  elapsed.
- **FR-012**: For elapsed hour blocks, the system MUST prevent editing of activities and MUST
  visually indicate the block as elapsed.
- **FR-013**: For upcoming hour blocks — including all blocks of future dates — the system
  MUST allow the child to edit and save activities.
- **FR-014**: System MUST retain saved agenda activities per date and per hour block across
  sessions.
- **FR-015**: When the child switches the selected date, the agenda MUST display the hour
  blocks and saved activities belonging to that date.

#### Today's Star

- **FR-016**: System MUST provide a "Today's Star" control that records whether a star was
  earned for the day, defaulting to off ("No Star").
- **FR-017**: System MUST allow the star to be toggled only for the current day and only
  before 21:30 on that day.
- **FR-018**: For any selected date other than today, the system MUST display that date's star
  status ("Star" or "No Star") as read-only.
- **FR-019**: At 21:30 on the current day, the system MUST lock that day's star, making it
  read-only; the star status displayed at 21:30 is final for that day. A day's star MUST be
  counted toward Stars Collected once the day has reached 21:30 with a star status of Yes.
- **FR-020**: System MUST retain each date's star status across sessions.

#### Star Wallet

- **FR-021**: System MUST display "Stars Collected" as the total number of stars earned across
  all days since first use, counting each day whose star status is Yes once that day has
  reached 21:30.
- **FR-022**: System MUST display "Star Balance", calculated as Stars Collected minus Stars
  Spent.
- **FR-023**: The Star Wallet values MUST reflect real-time totals and MUST NOT change based on
  the date selected in the calendar.

#### Rewards / Wants

- **FR-024**: System MUST allow the child to maintain a list of up to 3 Wants.
- **FR-025**: Each Want MUST have a description and a cost expressed as a whole number of stars
  between 1 and 5 inclusive.
- **FR-026**: System MUST allow adding a new Want only when fewer than 3 Wants exist.
- **FR-027**: System MUST allow the child to remove any Want that has not been redeemed.
- **FR-028**: System MUST allow a Want to be redeemed only when the Star Balance is greater
  than or equal to that Want's cost. The redeem control MUST be displayed at all times next to
  each Want — enabled when affordable, and disabled (with a tooltip explaining why) when not.
  The backend MUST additionally reject any redeem attempt where the balance is insufficient.
- **FR-029**: When a Want is redeemed, the system MUST remove it from the list, increase Stars
  Spent by the Want's cost, and recalculate Star Balance.
- **FR-030**: The Rewards list MUST reflect real-time state and MUST NOT change based on the
  date selected in the calendar.

#### Data Persistence

- **FR-031**: System MUST persist all of the child's data — name, agenda activities, per-date
  star statuses, Stars Collected, Stars Spent, and Wants — in shared remote storage so that it
  survives closing and reopening the dashboard AND is available when the same child opens the
  dashboard on a different device or browser.
- **FR-032**: System MUST identify the child by a simple access code so that their own data is
  loaded correctly across devices and browsers:
  - On first use, the system MUST let the child create a simple, memorable access code and
    MUST confirm that code back to the child.
  - On first use, the system MUST also ask the recovery question "What is the name of your
    school?" and store the child's answer.
  - On any device or browser, entering that access code MUST load the matching child's data.
  - If the child forgets their access code, the system MUST allow them to recover access by
    correctly answering the recovery question "What is the name of your school?".
  - Identification MUST NOT require an email address or a separate password.

#### Layout & Presentation

- **FR-033**: System MUST present all six sections together on a single standard browser page
  without requiring full-page scrolling; only the agenda's hour-block area scrolls internally.
  The arrangement MUST follow the layout described in "Visual Design & Layout".
- **FR-034**: System MUST apply a child-friendly visual theme consistent with the
  ocean / princess reference described in "Visual Design & Layout".

### Key Entities

- **Child Profile**: The single child using the dashboard; holds the display name. Persistent.
- **Day Record**: A calendar date and the data attached to it — its set of agenda hour blocks
  and its star status.
- **Agenda Hour Block**: One hour-long slot (between 07:00 and 21:00) belonging to a Day
  Record; holds optional activity text and has a derived state of elapsed or upcoming.
- **Star Status**: A per-date indicator of whether a star was earned (Yes / No); editable only
  on the current day.
- **Star Wallet**: The aggregate star economy — Stars Collected (lifetime earned), Stars Spent
  (lifetime redeemed), and Star Balance (Collected − Spent, derived).
- **Want (Reward)**: An item on the child's wish list with a description and a cost of 1–5
  stars; limited to 3 at a time; can be added, removed (if not redeemed), or redeemed (which
  consumes it).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A child can enter and save an activity for an upcoming hour block in under 30
  seconds.
- **SC-002**: On first use, at least 90% of children can find the current day and today's
  agenda without adult help.
- **SC-003**: All six sections are fully visible on a standard laptop screen (1366×768)
  without page scrolling.
- **SC-004**: Star Balance equals Stars Collected minus Stars Spent at every point in time
  (100% consistency).
- **SC-005**: A child can add a reward and redeem it (when affordable) in under 1 minute.
- **SC-006**: 100% of saved agenda activities, star statuses, and wallet totals remain correct
  and available after the browser is closed and reopened, including when the child opens the
  dashboard on a different device or browser.
- **SC-007**: No elapsed hour block and no non-today star status can be edited (0 successful
  edits across testing).
- **SC-008**: Switching the selected calendar date updates the agenda within 1 second and
  never changes the Star Wallet or Rewards list.
- **SC-009**: A Want can never be redeemed for more stars than the child's current balance
  (0 over-spends across testing).

## Visual Design & Layout

### Layout (per provided mock)

The dashboard uses a two-column layout that fits within one standard browser page:

- **Top band**: a wide "Welcome, <child name>" greeting panel on the left; a "Today's Date"
  panel on the right.
- **Left column** (wider): the **Agenda** panel (showing 4 hour rows at a time, each row with
  a time label, an activity area, and an edit affordance(clicking or tapping the activity area opens an inline additor)), with the **Your Rewards** panel
  below it (each Want shown with its description, a 1–5 star cost rating, and a remove control;
  plus an add control when fewer than 3 Wants exist).
- **Right column** (narrower): the **Today's Star** panel (a large star the child can toggle),
  the **Star Wallet** panel (Stars Collected and Star Balance shown side by side) below it,
  and the **Calendar / date selector** panel below that.

### Theme (per princess_ocean_dashboard.html reference)

A soft, playful, child-friendly ocean / princess aesthetic:

- Pastel background gradient from ocean blue to lavender.
- Rounded "card" panels (large corner radius) with translucent white fills, soft blur, light
  white borders, and gentle drop shadows.
- Playful display typography for headings paired with a rounded, highly readable body
  typeface.
- Warm gradient accents (pinks and lavender) for the header and primary buttons; gold stars
  for ratings and earned-star indicators.
- Light decorative background animation (e.g., rising bubbles, twinkling sparkles, a soft wave
  at the bottom) that does not distract from the content.

The file [assets/theme-and-layout-reference.md](assets/theme-and-layout-reference.md) captures
the precise palette, typography, and styling tokens extracted from the reference design.

## Assumptions

- The dashboard serves a single child whose data is stored remotely and is available across
  devices and browsers; the child identifies themselves to load their data (see FR-032).
- "Day 1 in production" means the first day the dashboard is used; there is no data for dates
  before it. Past dates with no saved data show an empty, read-only agenda and a "No Star"
  status.
- The calendar allows navigation to any past or future date.
- Time-of-day greeting boundaries are Morning 00:00–11:59, Afternoon 12:00–16:59, Evening
  17:00–23:59 (matching the reference design).
- Each hour block holds a single free-text activity entry.
- Saving an activity is an explicit action (e.g., an edit / save affordance per hour block,
  consistent with the mock).
- No history of redeemed Wants is kept; a redeemed Want is simply removed, and Stars Spent
  reflects the cumulative total spent.
- Want costs are whole numbers from 1 to 5.
- "Standard browser page" targets a typical laptop screen (around 1366×768) in a maximized
  browser window.
- All times and dates use the child's local device clock and time zone.
- The reference file `princess_ocean_dashboard.html` is a styling reference only; its specific
  content sections (chores, goals, videos, photos, movies) are not part of this feature.
