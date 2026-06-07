# REST API Contract Delta: Recurring Agenda Items

This document records only the **delta** on top of feature 001's REST contract
([../../001-kids-star-dashboard/contracts/rest-api.md](../../001-kids-star-dashboard/contracts/rest-api.md)).
All conventions defined there — base path, auth header, client-time header pattern, error
shape, and status-code semantics — apply unchanged.

## New endpoint

### POST /api/days/{date}/agenda/{hour}/recurrence — apply recurrence (auth required)

Applies a recurrence pattern to the agenda entry at `(date, hour)`, fanning out one
agenda entry per matching target date, atomically. The source entry is **not** modified.

**Path parameters**

| Param | Format | Notes |
| --- | --- | --- |
| `date` | `YYYY-MM-DD` | The source block's date. |
| `hour` | integer `7..20` | The source block's hour. |

**Request body**

```jsonc
{
  "type": "daily",            // or "weekly"; required
  "until": "2026-06-10",      // YYYY-MM-DD; required; inclusive; > date; ≤ clientDate + 90 days
  "clientDate": "2026-06-07", // YYYY-MM-DD; required
  "clientTime": "12:00"       // HH:mm 24-hour; required
}
```

**Success — `200 OK`**

```jsonc
{
  "created": 47,
  "dates": [
    "2026-06-08",
    "2026-06-09",
    "...",
    "2026-06-10"
  ]
}
```

- `created` — the number of agenda entries written (or overwritten) by this application.
  Equal to `dates.length`.
- `dates` — sorted ascending; lets the client invalidate any cached `day` state for these
  dates. Empty array (`created: 0`) is a valid success: occurs when `type === "weekly"`
  and no matching weekday falls in `[date + 7d, until]` (edge case per spec).

**Error responses**

| Status | `code` | When |
| --- | --- | --- |
| `400` | `invalid_input` | Body malformed (missing required field, bad enum, bad date/time format). |
| `401` | `unauthorized` | Missing / invalid / expired bearer token (inherited from auth middleware). |
| `404` | `source_not_found` | No `agenda_entries` row exists at `(childId, date, hour)`. |
| `422` | `source_empty` | Source row exists but `activity === ""`. (FR-002) |
| `422` | `source_elapsed` | Block has elapsed per `clientDate`/`clientTime`. (FR-002 + feature 001's elapsed-block rule) |
| `422` | `invalid_until_date` | `until` is not a real calendar date (`2026-02-30`, `2026-13-01`, malformed). (FR-008) |
| `422` | `until_not_future` | `until ≤ date`. (FR-009) |
| `422` | `until_too_far` | `until > clientDate + 90 days`. (FR-009A) |
| `500` | `internal` | The atomic fan-out failed mid-write; the transaction was rolled back. Source unchanged. Client should display the kid-friendly retry message. (FR-018) |

Error body shape is unchanged: `{ "error": { "code": "<machine_code>", "message": "<human text>" } }`.

## Endpoint ↔ requirement traceability

| Endpoint | Requirements |
| --- | --- |
| POST /api/days/{date}/agenda/{hour}/recurrence | FR-001, FR-002, FR-006…FR-016, FR-018; SC-001, SC-002, SC-003, SC-006, SC-008 |

UI-only requirements (no API surface):

| Requirement | Where exercised |
| --- | --- |
| FR-003, FR-004, FR-005, FR-007 | Frontend popover labels + tooltip; covered in Playwright specs. |
| FR-017 | Frontend copy; covered by Flesch–Kincaid lint (SC-007). |
| FR-019, FR-020, FR-021, FR-022, FR-023 | Frontend popover semantics; covered in Playwright specs. |

## Why no GET / DELETE on this endpoint

- **No GET**: recurrence is not a stored entity (per [../data-model.md](../data-model.md)).
  The agenda rows produced by the fan-out are read through the existing
  `GET /api/days/{date}` endpoint exactly like any other agenda row — that's the whole
  point of the independent-copies design.
- **No DELETE**: "remove recurrence" is explicitly out of scope (spec Assumptions).
  Generated rows are cleared individually via the existing
  `PUT /api/days/{date}/agenda/{hour}` with an empty activity string.

## Non-changes to feature 001's contract

- No changes to existing endpoints. `PUT /api/days/{date}/agenda/{hour}` and
  `GET /api/days/{date}` work identically.
- No changes to authentication, error shape, or status-code conventions.
- No new `clientDate`/`clientTime` convention — the body shape matches the existing
  mutating-endpoint pattern.
