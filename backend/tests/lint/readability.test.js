import { test } from 'node:test';
import assert from 'node:assert/strict';

// On-screen copy introduced by feature 002 (recurrence component + the agenda ↻
// icon's aria-label). The copy is collected here rather than parsed from the JS
// source so that the test stays a single small, deterministic input — the JS file
// itself includes comments, identifiers, etc. that would skew the metric.
const ON_SCREEN_COPY = [
  // Labels and structural text
  'Repeat',
  'How often?',
  'Every day',
  'Every Sunday',                // representative weekday — the label is dynamic
  'Until',
  'Tap to pick a day',
  'Confirm',
  'Not now',
  // Accessibility labels (read by screen readers, also count as on-screen copy)
  'Repeat this activity',
  'Confirm repeat',
  'Saving your repeat',
  // Kid-friendly error messages
  "Hmm, that day isn't on the calendar — try another one!",
  "Pick a day that hasn't happened yet",
  "Let's pick a day within the next 90 days",
  'Try again from a row with an activity in it',
  'That hour is in the past — try a different row',
  'Something looked off — please try again',
  "Hmm, something went wrong — let's try that again!",
  "We couldn't reach the server — let's try that again!",
];

// Approximate syllable count for an English word using a standard vowel-group
// heuristic. Not perfect, but sufficient for a copywriting smoke check.
function countSyllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  const groups = w.match(/[aeiouy]+/g);
  let n = groups ? groups.length : 0;
  if (w.endsWith('e') && n > 1) n -= 1; // silent terminal 'e'
  return Math.max(1, n);
}

// Flesch–Kincaid Grade Level. Spec SC-007 targets Grade ≤ 4.
function fleschKincaidGradeLevel(text) {
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const sentences = text.split(/[.!?\n]+/).filter((s) => s.trim().length > 0);
  const syllables = words.reduce((sum, w) => sum + countSyllables(w), 0);
  if (words.length === 0 || sentences.length === 0) return 0;
  return 0.39 * (words.length / sentences.length)
       + 11.8 * (syllables / words.length)
       - 15.59;
}

test('SC-007 — feature 002 on-screen copy reads at Grade Level ≤ 4', () => {
  // Combine into one corpus so the score reflects the overall reading load a
  // child encounters across the popover.
  const corpus = ON_SCREEN_COPY.map((s) => s.endsWith('.') || s.endsWith('!') || s.endsWith('?') ? s : `${s}.`)
    .join(' ');
  const grade = fleschKincaidGradeLevel(corpus);
  console.log(`[SC-007] Flesch–Kincaid Grade Level (feature 002 copy): ${grade.toFixed(2)}`);
  assert.ok(
    grade <= 4,
    `SC-007: collected on-screen copy scored Grade Level ${grade.toFixed(2)} (target ≤ 4). Simplify wording until the score drops.`,
  );
});

test('SC-007 — no single phrase contains a banned jargon word', () => {
  // FR-017 jargon list. The negative-action label "cancel" is also banned — it
  // was renamed to "Not now" during /speckit-clarify (Q3).
  const banned = ['recurrence', 'validate', 'invalid', 'horizon', 'fan-out', 'submit', 'cancel'];
  for (const phrase of ON_SCREEN_COPY) {
    const lower = phrase.toLowerCase();
    for (const word of banned) {
      assert.ok(
        !lower.includes(word),
        `On-screen copy "${phrase}" contains banned word "${word}" (FR-017 voice rule)`,
      );
    }
  }
});
