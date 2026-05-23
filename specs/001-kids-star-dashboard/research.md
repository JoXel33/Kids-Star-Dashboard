# Phase 0 Research: Kids Star Dashboard

This document records the technology and design decisions for the implementation plan. All
items are resolved — no `NEEDS CLARIFICATION` markers remain in the spec or plan.

## 1. Frontend approach

- **Decision**: Vanilla HTML/CSS/JS single-page app (ES2022 modules, no framework, no build
  step).
- **Rationale**: The provided `princess_ocean_dashboard.html` reference is itself vanilla, so
  the theme transfers directly. The dashboard is six sections on one screen — small enough
  that a framework adds tooling cost without proportional benefit. No build step means the
  static files can be served straight from Express.
- **Alternatives considered**: React + Vite and Vue + Vite — rejected as heavier than needed
  for a six-section dashboard and adding a build pipeline.

## 2. Backend approach

- **Decision**: Node.js 20 + Express 4 REST API. A single Express process also serves the
  static `frontend/` files, so the app is same-origin (no CORS) and deploys as one unit.
- **Rationale**: Cross-device sync (FR-031) requires a server. Express is minimal and
  well-understood; one process serving both frontend and API keeps deployment and local dev
  trivial.
- **Alternatives considered**: Supabase and Firebase — rejected to avoid an external
  account/dependency and vendor lock-in for what is a very small data model.

## 3. Storage

- **Decision**: SQLite (single file). Accessed via the Node-built-in `node:sqlite`
  module (`DatabaseSync`) rather than `better-sqlite3`.
- **Rationale**: Data volume is tiny and write concurrency is effectively single-user per
  child. SQLite is zero-config, file-based, transactional, and ideal for this scale. A
  synchronous API keeps service code simple. `node:sqlite` provides this without a native
  build step (see implementation note below).
- **Implementation pivot (during `/speckit-implement`)**: The plan originally specified
  `better-sqlite3`, but its native build failed on the user's Node v24 / Windows
  toolchain. `node:sqlite` (available in Node 22+, accessed with `--experimental-sqlite`)
  is the same SQLite engine with a near-identical synchronous API and required no native
  build. All design decisions in this document remain valid against `node:sqlite`.
- **Alternatives considered**: PostgreSQL (operational overhead unjustified at this scale);
  a plain JSON file (no transactions, no constraints, risk of corruption on concurrent
  writes); pinning an older `better-sqlite3` with prebuilt binaries (would still risk
  re-breaking on future Node upgrades).

## 4. Authority for date & time

- **Decision**: The **browser's local clock is the single source of truth** for the current
  date and time. "Today", whether an hour block is elapsed, and whether the 21:30 star lock
  has passed are all determined client-side. Mutating API requests that depend on time carry
  `clientDate` (`YYYY-MM-DD`) and `clientTime` (`HH:mm`) fields; the backend re-validates
  invariants using those values.
- **Rationale**: The spec states all times/dates use the child's local clock and time zone
  (Assumptions). A child may use devices in different time zones; trusting the browser keeps
  behaviour consistent with what the child sees. The backend stays time-zone agnostic — it
  only stores `YYYY-MM-DD` date strings and validates against client-supplied time.
- **Accepted risk**: A child could change their device clock to bypass the 21:30 lock or edit
  an elapsed hour. This is their own personal reward chart with no external stakes, so clock
  tampering is an accepted, low-impact risk and is documented rather than defended against.

## 5. Child identification & sessions

- **Decision**: The child is identified by a **child-chosen access code**, enforced unique
  across all children. On first use the child also sets a name and a recovery answer. Login
  exchanges the access code for an opaque **session token** (stored in a `sessions` table),
  sent thereafter as `Authorization: Bearer <token>`.
- **Hashing**: The access code and the recovery answer are stored as `HMAC-SHA256(serverSecret,
  normalizedValue)` — never in plaintext. HMAC (not bcrypt) is used deliberately so the access
  code remains a deterministic lookup key (login must find the child by code in O(1)). The
  server secret lives in an environment variable.
- **Rationale**: A primary-school child cannot manage email or strong passwords (clarification
  Q2). An access code is age-appropriate; a session token avoids resending the code on every
  request. HMAC hashing means a database leak does not directly expose codes while still
  allowing code-based lookup.
- **Alternatives considered**: Plaintext code storage (rejected — needless exposure); bcrypt
  per-value salting (rejected — breaks O(1) code lookup); resending the access code on every
  request instead of a session token (rejected — keeps the secret in flight unnecessarily).

## 6. Forgotten-code recovery

- **Decision**: Recovery requires the child to supply **their name plus the recovery answer**
  to "What is the name of your school?" (clarification Q5). The backend looks up children
  whose stored `name` and `recovery_answer_hash` both match. If exactly one matches, the child
  may set a new access code in the same request and is logged in. If zero or multiple match,
  recovery fails with a friendly message suggesting they ask a parent or teacher for help.
- **Rationale**: The recovery answer alone is not unique (many children share a school), and
  the access code — the only true identifier — is what was lost. Pairing it with the name
  makes the lookup specific enough for realistic single-family / single-classroom use.
- **Known limitation**: If the child left their name blank, or two children share both a name
  and a school, recovery is ambiguous and will fail. This is an accepted limitation of a
  deliberately low-friction, no-email identity scheme. Recovery answers are normalized
  (trimmed, lower-cased) before hashing so capitalisation/spacing differences do not block a
  match.

## 7. Star economy: stored vs. derived values

- **Decision**:
  - **Stars Collected** is **derived**, never stored: `COUNT` of the child's day-star records
    that are earned **and** counted, where a day is *counted* when `date < clientToday` OR
    (`date == clientToday` AND `clientTime >= 21:30`).
  - **Stars Spent** is a **stored accumulator** (`children.stars_spent`), incremented on each
    redemption. It must be stored because the spec keeps no redemption history (Assumptions),
    so it cannot be re-derived.
  - **Star Balance** is **derived**: `Stars Collected − Stars Spent`.
- **Rationale**: Deriving Stars Collected from day-star rows means it is always correct even
  if the app was closed at 21:30 on some day. Storing Stars Spent is the only option given no
  redemption log is kept. The redeem endpoint runs as a single SQLite transaction
  (validate balance → delete want → increment `stars_spent`) so Balance can never go negative.

## 8. One-screen layout

- **Decision**: CSS Grid two-column layout sized to the viewport (`100vh`), with **only the
  agenda's hour-block list** scrolling internally (it shows 4 of 14 blocks). No full-page
  scroll.
- **Rationale**: Satisfies FR-033 and SC-003. The agenda is the one section whose content
  exceeds its box, so it gets an internal scroll container; everything else is fixed-height.
- **Alternatives considered**: Letting the whole page scroll (rejected — violates the
  one-screen constraint).

## 9. Theme implementation

- **Decision**: Port the ocean/princess theme into `frontend/css/styles.css` using the tokens
  captured in [assets/theme-and-layout-reference.md](assets/theme-and-layout-reference.md):
  pastel blue→lavender background gradient, translucent rounded cards, Fredoka One + Nunito
  fonts, pink/lavender accent gradients, gold stars, and subtle background decoration
  (bubbles, sparkles, bottom wave).
- **Rationale**: The reference file's section content (chores, goals, videos, etc.) is not
  part of this feature — only its visual language is reused, applied to the six sections this
  dashboard actually has.

## 10. Children's data protection (deferred from clarification)

- **Decision**: Minimise and protect personal data:
  - Store only a **first name** (free text the child types) — no surname, no email, no DOB.
  - Hash access codes and recovery answers (see §5); never log them.
  - Serve over **HTTPS** in any non-local deployment; mark the session cookie/token handling
    accordingly.
  - No third-party analytics, ads, or trackers.
  - Provide a way to delete a child's data (a `DELETE /api/children/me` endpoint) so a
    parent can remove everything.
- **Rationale**: Cross-device storage introduces a server holding a child's data, raising
  children's-privacy considerations (e.g., COPPA / GDPR-K). Keeping stored data to an
  optional first name plus non-reversible hashes, and offering deletion, keeps the footprint
  minimal. Full legal compliance review remains an operational task outside this feature's
  build scope.

## 11. Testing strategy

- **Decision**: Backend — Node's built-in `node:test` runner with **Supertest** for
  HTTP-level contract tests (one file per endpoint group) and integration tests (full
  user-story flows against an in-memory/temp SQLite database). Frontend — **Playwright** E2E
  tests, one spec per user story, driving a real browser against a running server seeded with
  known data.
- **Rationale**: Aligns with the intended Test-First principle. `node:test` + Supertest need
  no extra test framework; Playwright is the standard for verifying real browser behaviour
  (elapsed-hour locking, the 21:30 lock, one-screen layout) that unit tests cannot cover.
