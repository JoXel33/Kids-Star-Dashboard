# Phase 1 Data Model: Kids Star Dashboard

Storage: SQLite (single file) via `better-sqlite3`. All dates are stored as `TEXT` in
`YYYY-MM-DD` format; all timestamps as ISO-8601 `TEXT`. Booleans are stored as `INTEGER`
(`0`/`1`).

## Entity overview

| Entity | Table | Purpose |
|--------|-------|---------|
| Child Profile | `children` | One row per child — name, credentials, lifetime spend |
| Session | `sessions` | Opaque login tokens mapping to a child |
| Star Status | `day_stars` | Per-date earned/not-earned flag |
| Agenda Hour Block | `agenda_entries` | Per-date, per-hour activity text |
| Want (Reward) | `wants` | Active wish-list items (≤3 per child) |

Derived (never stored): **Stars Collected**, **Star Balance** — see "Derived values".

## Table: `children`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `name` | TEXT | NOT NULL, DEFAULT `''` | Child's first name; may be empty |
| `access_code_hash` | TEXT | NOT NULL, UNIQUE | `HMAC-SHA256(secret, normalized code)` |
| `recovery_answer_hash` | TEXT | NOT NULL | `HMAC-SHA256(secret, normalized answer)` |
| `created_date` | TEXT | NOT NULL | `YYYY-MM-DD` — the child's "day 1" |
| `stars_spent` | INTEGER | NOT NULL, DEFAULT 0, CHECK ≥ 0 | Lifetime stars redeemed (accumulator) |
| `created_at` | TEXT | NOT NULL | ISO-8601 timestamp |

- `access_code_hash` UNIQUE enforces globally unique access codes.
- The recovery question is fixed ("What is the name of your school?"); only the answer is
  stored.

## Table: `sessions`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `token` | TEXT | PK | Opaque random token (≥32 bytes, hex) |
| `child_id` | INTEGER | NOT NULL, FK → `children(id)` ON DELETE CASCADE | |
| `created_at` | TEXT | NOT NULL | ISO-8601 |
| `expires_at` | TEXT | NOT NULL | ISO-8601; default 90 days ahead |

Index: `idx_sessions_child` on `child_id`.

## Table: `day_stars`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `child_id` | INTEGER | NOT NULL, FK → `children(id)` ON DELETE CASCADE | |
| `date` | TEXT | NOT NULL | `YYYY-MM-DD` |
| `earned` | INTEGER | NOT NULL, DEFAULT 0, CHECK IN (0,1) | 1 = star earned |

- UNIQUE `(child_id, date)` — at most one star record per child per day.
- A missing row means "No Star" (default off, FR-016). Rows are created/updated only when the
  child toggles a star.
- Index: `idx_day_stars_child` on `child_id`.

## Table: `agenda_entries`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `child_id` | INTEGER | NOT NULL, FK → `children(id)` ON DELETE CASCADE | |
| `date` | TEXT | NOT NULL | `YYYY-MM-DD` |
| `hour` | INTEGER | NOT NULL, CHECK BETWEEN 7 AND 20 | Block start hour (7 → 07:00–08:00 … 20 → 20:00–21:00) |
| `activity` | TEXT | NOT NULL, DEFAULT `''` | Free-text activity for the block |

- UNIQUE `(child_id, date, hour)` — one activity entry per block.
- 14 possible blocks per day (`hour` 7…20), covering 07:00–21:00.
- Rows are created only for blocks the child fills in.
- Index: `idx_agenda_child_date` on `(child_id, date)`.

## Table: `wants`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTOINCREMENT | |
| `child_id` | INTEGER | NOT NULL, FK → `children(id)` ON DELETE CASCADE | |
| `description` | TEXT | NOT NULL | The wish-list item |
| `cost` | INTEGER | NOT NULL, CHECK BETWEEN 1 AND 5 | Star cost |
| `sort_order` | INTEGER | NOT NULL, DEFAULT 0 | Display order |
| `created_at` | TEXT | NOT NULL | ISO-8601 |

- The "max 3 wants" rule is enforced in the service layer (count check before insert) — SQLite
  cannot express a per-parent row-count constraint cleanly.
- Redeeming or removing a Want **deletes** the row; no history is kept (spec Assumptions).
- Index: `idx_wants_child` on `child_id`.

## Derived values

Computed on read, using the client-supplied `clientDate` / `clientTime`:

- **Counted day**: a `day_stars` row counts toward the wallet when
  `date < clientDate` OR (`date == clientDate` AND `clientTime >= "21:30"`).
- **Stars Collected** = `COUNT(day_stars WHERE child_id = ? AND earned = 1 AND counted)`.
- **Star Balance** = `Stars Collected − children.stars_spent`.

## Validation rules

| Field | Rule | Source |
|-------|------|--------|
| `name` | 0–40 characters | FR-002 / FR-003 |
| access code | 4–20 characters, child-chosen, unique | FR-032 |
| recovery answer | 1–60 characters; normalized (trim + lower-case) before hashing | FR-032 |
| `agenda_entries.activity` | 0–200 characters | FR-010 |
| `agenda_entries.hour` | integer 7–20 | FR-008 |
| agenda edit allowed | only when block is **not elapsed** on the selected date | FR-011/012/013 |
| `day_stars.earned` toggle | allowed only when `date == clientDate` AND `clientTime < "21:30"` | FR-017 / FR-019 |
| `wants` count | at most 3 active per child | FR-024 / FR-026 |
| `wants.description` | 1–60 characters | FR-025 |
| `wants.cost` | integer 1–5 | FR-025 |
| want redeem allowed | only when `Star Balance >= want.cost` | FR-028 |

**Elapsed block rule**: a block on `date` with start `hour` is elapsed when
`date < clientDate` OR (`date == clientDate` AND `clientTime >= (hour + 1):00`). The
in-progress hour is therefore still editable until its end time passes (clarification Q4).

## State transitions

**Child** — created at first use → `name` editable any time → access code resettable via
recovery → (optional) deleted via `DELETE /api/children/me` (cascades to all child data).

**Star Status (per date)**
```
No Star (no row / earned=0)
   └─ toggle (date == today, time < 21:30) ──▶ Star (earned=1)
   ◀─ toggle (date == today, time < 21:30) ──┘
At 21:30 on that date ──▶ LOCKED (read-only; current earned value is final & counted)
Past dates load directly in the LOCKED state (read-only).
```

**Agenda Hour Block**
```
Empty (no row)
   └─ save activity (block not elapsed) ──▶ Filled (editable while still upcoming/in-progress)
   ◀─ edit activity (block not elapsed) ──┘
Block end time passes ──▶ ELAPSED (read-only)
Past-date blocks load directly in the ELAPSED state.
```

**Want**
```
(absent) ──add (child has <3 wants)──▶ Active
Active ──remove──▶ (deleted, no balance change)
Active ──redeem (Star Balance >= cost)──▶ (deleted; children.stars_spent += cost)
```
