# Recurrence Affordance — Visual Reference

This document captures what the original `mock2.jpg` shows for the **Repeat** affordance
(referenced as "Add Recurrence" in the source spec input). The mock itself is a user
input artifact and is **not tracked** — its salient details are recorded here.

## Where the affordance lives

A small **circular-arrows icon (↻)** sits at the right edge of an agenda row, after the
activity text. It appears **only on rows that already contain an activity** and are not
elapsed; empty rows ("tap to add") and elapsed rows do not show it.

```
┌────────────── Agenda — Today ───────────────────────────────┐
│ 07:00–08:00   Test recurrence                           ↻   │  ← filled → ↻ shown
│ 08:00–09:00   (tap to add)                                  │  ← empty → no icon
│ 09:00–10:00   (tap to add)                                  │
│ 10:00–11:00   (tap to add)                                  │
│ …                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Visual treatment

| Aspect | Detail |
| --- | --- |
| **Glyph** | Two curved arrows forming a loop (Unicode `↻` / equivalent SVG). |
| **Colour** | Purple, matching the existing `card-title` colour (`#8040c0`). |
| **Size** | Comparable visual weight to other inline controls in the agenda row (e.g., the green `save-btn` text). Not larger. |
| **Position** | Right-aligned within the agenda row, in the same column slot as the existing `elapsed-tag` text. |
| **Visibility rule** | Only on rows where `activity` is non-empty AND the block is not elapsed. |
| **Interactivity** | Click/tap opens the **Repeat** popover anchored to this row (FR-019). Hover affordance to match the existing button hover behaviour (slight scale or background fade). |

## Mapping to existing components

- The agenda row markup is defined in [frontend/js/components/agenda.js](../../../frontend/js/components/agenda.js).
- The row's three-column grid (`100px 1fr 80px`) is in
  [frontend/css/styles.css](../../../frontend/css/styles.css) at the `.agenda-row` rule.
  The ↻ icon belongs in the right (80px) column when the row is filled and non-elapsed,
  replacing where the `elapsed-tag` would otherwise sit.

## Cross-references

- **FR-001** (Repeat affordance presence) and **FR-002** (gating on empty/elapsed) — the
  visual and gating rules above are the implementation of these two requirements.
- **FR-019** — the popover opened by clicking the icon is anchored to this row.
- Mock2 (original `.jpg`) lives only on the author's machine and is `.gitignored`.
