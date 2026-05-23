<!--
SYNC IMPACT REPORT
==================
Version change: TEMPLATE (unratified placeholders) → 1.0.0 (initial ratification)

Modified principles: none (initial set)

Added sections:
  - Core Principles
      I.   Test-First Development (NON-NEGOTIABLE)
      II.  Specification-Driven Workflow
      III. Simplicity & YAGNI
      IV.  Child-First User Experience
      V.   Children's Data Protection
  - Quality Standards
  - Development Workflow
  - Governance

Removed sections: none

Templates and runtime docs requiring updates:
  - .specify/templates/plan-template.md      — ✅ no change (template's
        "Constitution Check" slot is generic; future plans populate it against
        these v1.0.0 principles).
  - .specify/templates/spec-template.md      — ✅ no change (user-value focus,
        measurable Success Criteria, and Edge Cases already align with
        Principles II and IV).
  - .specify/templates/tasks-template.md     — ✅ no change (Setup →
        Foundational → US phases with optional tests-first → Polish already
        supports Principles I and II).
  - .specify/templates/commands/*.md         — N/A (not present in this
        installation; skills under .claude/skills/ serve the equivalent role
        and need no change).
  - CLAUDE.md                                — ✅ no change (points at active
        plan; no principle reference to update).
  - specs/001-kids-star-dashboard/plan.md    — ✅ updated: "Constitution
        Check" rewritten from "not ratified" to evaluate against v1.0.0
        (PASS for all five principles).

Follow-up items:
  - The /speckit-analyze finding C2 (no frontend control for DELETE
    /api/children/me) remains outstanding. It is consistent with Principle V
    (Children's Data Protection) and should be added as a polish task before
    /speckit-implement closes.
  - No deferred bracketed placeholders.
-->

# DashWithClaude Constitution

## Core Principles

### I. Test-First Development (NON-NEGOTIABLE)

All behaviour-changing code MUST be developed test-first. For every feature, contract,
integration, and end-to-end tests are authored before any implementation task is started, and
the new tests MUST be observed to FAIL before any implementation work begins. The Red → Green
→ Refactor cycle is strictly enforced. Implementation-only changes that bypass this gate
require an explicit, documented exception in the plan's "Complexity Tracking" section.

**Rationale**: This dashboard accumulates a child's reward history over months. Silent
regressions that lose stars, corrupt the agenda, or alter the wallet are high-impact and hard
to detect after the fact. Test-first practice surfaces those failures at the moment they are
introduced and proves every behaviour is observable.

### II. Specification-Driven Workflow

Every feature MUST flow through the Spec Kit pipeline before implementation begins:
`/speckit-specify` → (`/speckit-clarify` whenever the spec carries `[NEEDS CLARIFICATION]`
markers or material ambiguity) → `/speckit-plan` → `/speckit-tasks` → (`/speckit-analyze`
recommended) → `/speckit-implement`. Implementation MUST NOT start before `tasks.md` exists
and is committed. Every plan MUST include a "Constitution Check" section that evaluates each
principle below and records PASS or VIOLATION with justification.

**Rationale**: A small team working with an LLM is easy to derail by ad-hoc changes. The
spec-first flow keeps requirements, design, and execution traceable and reviewable, and gives
every artefact a stable place to live.

### III. Simplicity & YAGNI

Choose the smallest viable solution that satisfies the spec. Do NOT introduce frameworks,
abstractions, services, feature flags, or configuration knobs to support hypothetical future
needs. Three similar lines of code beat one premature abstraction. Any complexity beyond the
simplest viable option MUST be justified in the plan's "Complexity Tracking" table, with the
simpler alternative recorded and the reason it was rejected.

**Rationale**: This product's domain — one child, six sections, one screen — is intentionally
small. The chosen stack (vanilla HTML/CSS/JS, a minimal Express API, file-backed SQLite) is an
applied instance of this principle: it fits the actual scale without ceremony.

### IV. Child-First User Experience

Every user-facing surface MUST be designed for a primary-school child as the primary user:
clear, friendly language (no jargon, no error codes shown to the child); large, forgiving
touch/click targets (≥40 px on the longest dimension); single-screen experiences where the
spec requires them (no full-page scroll); visual design consistent with the project's playful
theme. Local interactions MUST feel instant (perceived response under 200 ms); data fetches
MUST complete within 1 s under normal network conditions.

**Rationale**: A child cannot diagnose UX failures the way an adult can. A confusing, slow, or
scary experience causes the child to stop using the tool, destroying its value entirely.

### V. Children's Data Protection

Personal data collected from a child MUST be minimised, protected, and deletable. Specifically:

- Collect only the data the spec requires (today: first name plus the chosen access code and
  recovery answer). No surname, no email from the child, no date of birth, no surveillance
  beacons.
- Store credentials and recovery answers as deterministic HMACs, never plaintext, and never
  log them.
- Never integrate third-party analytics, advertising, or tracking SDKs.
- Always expose a "delete my data" capability (e.g., `DELETE /api/children/me`) that cascades
  to every owned record, and surface it in the UI so a parent can use it.

**Rationale**: Cross-device sync inherently means a server holds a child's data, which triggers
children's-privacy concerns (e.g., COPPA / GDPR-K). Minimisation, hashing, and easy deletion
are the cheapest, strongest defences for a project that cannot afford a full compliance
programme.

## Quality Standards

The following measurable standards MUST be met for any feature before it is considered "done":

- **Tests**: contract, integration, and end-to-end tests for each user story exist and pass;
  the test files were written before their corresponding implementation tasks.
- **Layout**: where the spec requires a single-screen experience, all sections fit the target
  viewport (1366 × 768 minimum) without full-page scrolling.
- **Perceived performance**: local interactions feel instant (< 200 ms); data fetches from the
  backend complete within 1 s under normal conditions.
- **Accessibility (child-grade)**: body text ≥ 14 px, high contrast against the theme
  background, descriptive labels on every interactive control, and no reliance on hover-only
  affordances.
- **Data-integrity invariants**: invariants stated in the spec or data model MUST hold at
  every observable point in time (for the current feature: `Star Balance = Stars Collected −
  Stars Spent`; redeem actions run as a single transaction so Balance can never go negative).

## Development Workflow

- Feature work follows the Spec Kit pipeline (Principle II). Each command's outputs are
  reviewable artefacts under `specs/<feature>/`.
- Branches are per-feature (`NNN-feature-name`), created by `/speckit-git-feature`.
- Auto-commit is enabled (`.specify/extensions/git/git-config.yml`) so each pipeline step
  produces a commit on the feature branch.
- Every plan MUST include a "Constitution Check" section that lists each principle and states
  PASS or VIOLATION. A VIOLATION MUST be justified in "Complexity Tracking" with the simpler
  alternative recorded.
- Run `/speckit-analyze` before `/speckit-implement` whenever the spec / plan / tasks triad
  has changed materially; resolve any CRITICAL or HIGH findings first.
- Agent-specific guidance (e.g., `CLAUDE.md`, agent skill files) is the place for runtime,
  tool, and shortcut information — NOT this constitution.

## Governance

- This constitution supersedes any ad-hoc practice in conflict with it. Where the constitution
  is silent, project-level defaults and the active plan apply.
- **Amendments** are made by re-running `/speckit-constitution`, which updates this file,
  increments the version per the policy below, and produces a Sync Impact Report covering
  dependent templates and any active plans.
- **Versioning policy** (semantic versioning):
  - **MAJOR**: a backward-incompatible principle removal or redefinition (e.g., removing TDD
    as non-negotiable, or replacing the Spec Kit workflow).
  - **MINOR**: a new principle or section, or materially expanded normative guidance.
  - **PATCH**: clarifications, wording fixes, or non-semantic refinements.
- **Compliance review**: any feature whose plan declares a Constitution VIOLATION MUST include
  a "Complexity Tracking" entry naming the principle, the reason it is violated, and the
  simpler alternative considered. Reviewing such a plan is a conscious decision, not an
  oversight.
- A plan's Constitution Check that was performed against an earlier constitution version MUST
  be re-evaluated against the current version before `/speckit-implement` runs.

**Version**: 1.0.0 | **Ratified**: 2026-05-23 | **Last Amended**: 2026-05-23
