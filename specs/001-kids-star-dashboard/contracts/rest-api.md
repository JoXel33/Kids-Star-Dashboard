# REST API Contract: Kids Star Dashboard

Base path: `/api`. All request and response bodies are JSON (`Content-Type: application/json`).
A single Express process serves this API and the static frontend (same origin).

## Conventions

- **Authentication**: all endpoints except the identity endpoints (§1) require a header
  `Authorization: Bearer <sessionToken>`. Missing/invalid/expired token → `401`.
- **Client time**: mutating endpoints that depend on date/time accept `clientDate`
  (`YYYY-MM-DD`) and `clientTime` (`HH:mm`, 24-hour) in the body. The server re-validates
  invariants against these values.
- **Error shape**: `{ "error": { "code": "<machine_code>", "message": "<human text>" } }`.
- **Status codes**: `200` OK, `201` Created, `400` malformed input, `401` unauthorized,
  `404` not found, `409` conflict (e.g., access code taken), `422` rule violation
  (e.g., elapsed block, insufficient balance, want limit).

### Common objects

```jsonc
// Child
{ "id": 1, "name": "Mia", "createdDate": "2026-05-23" }

// Wallet
{ "starsCollected": 7, "starsSpent": 4, "starBalance": 3 }

// Day
{
  "date": "2026-05-23",
  "star": { "earned": true },
  "agenda": [ { "hour": 7, "activity": "Breakfast" }, { "hour": 8, "activity": "" } ]
}

// Want
{ "id": 12, "description": "Ice cream", "cost": 3, "sortOrder": 0 }
```

---

## 1. Identity (no auth required)

### POST /api/children — first-use setup

Create a new child. Request:

```jsonc
{
  "name": "Mia",                 // optional, 0–40 chars
  "accessCode": "bluefish",      // required, 4–20 chars
  "recoveryAnswer": "Oak Park",  // required, 1–60 chars (answer to the fixed question)
  "createdDate": "2026-05-23"    // required, client's local date — the child's "day 1"
}
```

- `201` → `{ "sessionToken": "<token>", "child": Child }`
- `409` `access_code_taken` — chosen access code already in use
- `400` `invalid_input` — field fails validation

### POST /api/sessions — login

```jsonc
{ "accessCode": "bluefish" }
```

- `200` → `{ "sessionToken": "<token>", "child": Child }`
- `401` `invalid_access_code`

### DELETE /api/sessions — logout (auth required)

Deletes the current session token so it can no longer be used. Other live sessions for the
same child (e.g. a second device) are unaffected.

- `204` No Content
- `401` `unauthorized` — missing or already-invalid token

### POST /api/recovery — recover a forgotten access code

The recovery question is fixed: *"What is the name of your school?"*

```jsonc
{
  "name": "Mia",                    // required — used with the answer to locate the child
  "recoveryAnswer": "Oak Park",     // required
  "newAccessCode": "pinkshell"      // required, 4–20 chars — replaces the lost code
}
```

- `200` → `{ "sessionToken": "<token>", "child": Child }` (code is now updated)
- `401` `recovery_no_match` — no child matches name + answer
- `409` `recovery_ambiguous` — more than one child matches; advise asking an adult
- `409` `access_code_taken` — `newAccessCode` already in use

---

## 2. Child profile (auth required)

### GET /api/children/me

- `200` → `{ "child": Child }`

### PATCH /api/children/me — update name

```jsonc
{ "name": "Mia Rose" }   // 0–40 chars
```

- `200` → `{ "child": Child }`

### DELETE /api/children/me — delete all of this child's data

- `204` No Content (cascades to sessions, day_stars, agenda_entries, wants)

---

## 3. Days — agenda & star (auth required)

### GET /api/days/{date}

`date` = `YYYY-MM-DD`. Returns the day's star status and all 14 agenda blocks (missing blocks
returned with empty `activity`).

- `200` → `{ "day": Day }`

### PUT /api/days/{date}/agenda/{hour} — save an hour block's activity

`hour` = 7…20. Request:

```jsonc
{
  "activity": "Maths homework",   // 0–200 chars
  "clientDate": "2026-05-23",
  "clientTime": "14:05"
}
```

- `200` → `{ "entry": { "hour": 14, "activity": "Maths homework" } }`
- `422` `block_elapsed` — the block is elapsed on `{date}` per the client time and cannot be
  edited
- `400` `invalid_input`

### PUT /api/days/{date}/star — set the day's star

```jsonc
{
  "earned": true,
  "clientDate": "2026-05-23",
  "clientTime": "20:10"
}
```

- `200` → `{ "star": { "earned": true } }`
- `422` `star_not_today` — `{date}` is not the client's current date
- `422` `star_locked` — it is `21:30` or later on `{date}`; the star is locked
- `400` `invalid_input`

---

## 4. Wallet (auth required)

### GET /api/wallet

Query params: `clientDate` (`YYYY-MM-DD`, required), `clientTime` (`HH:mm`, required).

- `200` → `{ "wallet": Wallet }`

`starsCollected` counts every earned day-star that is "counted" (`date < clientDate`, or
`date == clientDate` and `clientTime >= "21:30"`). `starBalance = starsCollected − starsSpent`.

---

## 5. Wants (auth required)

### GET /api/wants

- `200` → `{ "wants": Want[] }` (0–3 items, ordered by `sortOrder`)

### POST /api/wants — add a Want

```jsonc
{ "description": "Ice cream", "cost": 3 }   // description 1–60 chars, cost integer 1–5
```

- `201` → `{ "want": Want }`
- `422` `want_limit_reached` — the child already has 3 Wants
- `400` `invalid_input` — description or cost fails validation

### DELETE /api/wants/{id} — remove a Want

- `204` No Content
- `404` `want_not_found`

### POST /api/wants/{id}/redeem — redeem a Want

```jsonc
{ "clientDate": "2026-05-23", "clientTime": "20:10" }
```

Runs as a single transaction: validate balance → delete the want → increment `stars_spent`.

- `200` → `{ "wallet": Wallet }` (updated wallet after the spend)
- `422` `insufficient_balance` — `Star Balance < want.cost`; the want is unchanged
- `404` `want_not_found`

---

## Endpoint ↔ requirement traceability

| Endpoint(s) | Requirements |
|-------------|--------------|
| POST /children, POST /sessions, DELETE /sessions, POST /recovery | FR-031, FR-032 |
| GET/PATCH/DELETE /children/me | FR-002, FR-003, FR-031, data-protection (research §10) |
| GET /days/{date} | FR-007, FR-014, FR-015, FR-018 |
| PUT /days/{date}/agenda/{hour} | FR-008–FR-013 |
| PUT /days/{date}/star | FR-016, FR-017, FR-019, FR-020 |
| GET /wallet | FR-021, FR-022, FR-023 |
| GET/POST/DELETE /wants, POST /wants/{id}/redeem | FR-024–FR-030 |
