# Phase 1 Data Model: Recurring Agenda Items

This feature **introduces no new entities or schema changes**. Recurrence is implemented as
a fan-out write against the existing `agenda_entries` table from feature 001. This
document records the interaction model, the invariants that recurrence relies on, and the
transactional guarantees.

## Reused entities

### `agenda_entries` (existing, from feature 001)

```sql
CREATE TABLE IF NOT EXISTS agenda_entries (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  child_id  INTEGER NOT NULL REFERENCES children(id) ON DELETE CASCADE,
  date      TEXT NOT NULL,
  hour      INTEGER NOT NULL CHECK (hour BETWEEN 7 AND 20),
  activity  TEXT NOT NULL DEFAULT '',
  UNIQUE (child_id, date, hour)
);
CREATE INDEX IF NOT EXISTS idx_agenda_child_date ON agenda_entries(child_id, date);
```

| Column | Role for recurrence |
| --- | --- |
| `id` | Per-row identity. Generated rows each get their own; no cross-row link to the source. |
| `child_id` | Authentication scope. Every generated row carries the source's `child_id`. |
| `date` | Target date — one row per matching date in the fan-out range. |
| `hour` | Source's hour, copied verbatim for every generated row. |
| `activity` | Source's activity string, copied verbatim. |

Key properties this feature **relies on**:

- The **`UNIQUE (child_id, date, hour)`** constraint is what makes the upsert safe and
  guarantees FR-013 (overwrite on collision) without explicit pre-checks.
- `ON DELETE CASCADE` from feature 001's `children` row means deleting the child cleans
  up every generated copy too — Principle V (Data Protection) is automatically honoured.
- No `series_id` or `created_by_recurrence` column is added. Per Clarification Q1 and
  FR-015, generated rows are indistinguishable from manually-typed rows — that's the
  point.

## Recurrence request (transient, in-memory only)

Not persisted. Lives only inside one POST request:

```text
RecurrenceRequest {
  type:       "daily" | "weekly"
  until:      "YYYY-MM-DD"
  clientDate: "YYYY-MM-DD"
  clientTime: "HH:mm"
  // From URL path: sourceDate (YYYY-MM-DD), sourceHour (7..20)
  // From auth middleware: childId
}
```

Validation rules (resolved at the service boundary):

| Rule | Source of truth | Error code on failure |
| --- | --- | --- |
| `type` in `{"daily","weekly"}` | spec FR-004 | `400 invalid_input` |
| `until` is a valid `YYYY-MM-DD` calendar date | spec FR-006, FR-008 | `422 invalid_until_date` |
| `until > sourceDate` (strict) | spec FR-009 | `422 until_not_future` |
| `until <= clientDate + 90 days` (inclusive) | spec FR-009A | `422 until_too_far` |
| Source agenda entry exists for `(childId, sourceDate, sourceHour)` | spec FR-001 | `404 source_not_found` |
| Source `activity !== ""` | spec FR-002 | `422 source_empty` |
| Source block is not elapsed per `clientDate`/`clientTime` | spec FR-002 | `422 source_elapsed` |

## Target date enumeration

Pure function `enumerateTargets(type, sourceDate, until)`:

```text
type === "daily":
  targets = [sourceDate + 1d, sourceDate + 2d, ..., until]   (inclusive)
type === "weekly":
  targets = [sourceDate + 7d, sourceDate + 14d, ..., d]      (inclusive,
            where d is the latest date ≤ until whose day-of-week == sourceDate's)
```

Edge results allowed by spec:

- **`targets.length === 0`** when `type === "weekly"` and `until < sourceDate + 7d`
  (e.g., source is Sunday, until is the following Friday). This is **NOT an error**; the
  fan-out simply writes zero rows. Edge case bullet "Weekly recurrence with no matching
  weekday in range" already covers this.
- **`targets.length` upper bound** is 90 for Daily (FR-009A cap) and 13 for Weekly
  (`floor(90 / 7) + 1 = 13` matching weekdays in any 90-day window).

## Atomic fan-out semantics

The service layer wraps every fan-out in a single SQLite transaction:

```text
BEGIN
  for each target ∈ targets:
    upsert agenda_entries (child_id, date, hour, activity) values (...)
COMMIT
```

with `ROLLBACK` on any exception. Per FR-018 and SC-008:

- **On success**: all `targets.length` rows are present (existing rows in the same slot
  overwritten); zero rows outside the target set are touched. The source row at
  `(sourceDate, sourceHour)` is **NOT** written to.
- **On failure** (at any point): zero rows from this application persist. Rows that were
  already present in target slots (overwrite candidates) keep their pre-transaction
  values. The source row is unchanged.

## Invariants that recurrence must preserve

These are inherited from feature 001 and **MUST** continue to hold after any recurrence
application:

| Invariant | Source |
| --- | --- |
| `agenda_entries.hour ∈ [7, 20]` | CHECK constraint + FR-001/FR-009 of feature 001 |
| Exactly one row per `(child_id, date, hour)` | UNIQUE constraint |
| `agenda_entries.date` matches `YYYY-MM-DD` format (10 chars, `length(date)=10`) | Convention from feature 001; producer guarantee in the recurrence service |
| Star Balance = Stars Collected − Stars Spent | Unaffected — recurrence does not touch stars (assumption) |

The middle row above is worth calling out: a past bug encountered during this session was
exactly an `agenda_entries.date` row inserted with a non-canonical date string (no
zero-padding / extra whitespace). The recurrence service MUST produce dates via the
project's `lib/time.js` helpers — never string-concatenation — to avoid recreating that
class of bug at 90× scale.

## What is **not** in the data model

- No `agenda_series` table.
- No `agenda_entries.series_id` or `created_by_recurrence` column.
- No `recurrence_requests` audit table.
- No new index. The existing `idx_agenda_child_date(child_id, date)` already speeds up the
  read paths recurrence relies on (validation read of the source row, target-slot upserts
  hit the unique key).

This is a deliberate YAGNI choice (Principle III). If a future feature genuinely needs to
"undo a series" or "highlight recurring rows in the UI", a follow-up migration can add
the column; the current spec explicitly excludes both.
