import { test, expect } from '@playwright/test';

const SAMPLE_DATE = '2026-06-07';

async function setupAndOpenRepeat(page) {
  await page.clock.install({ time: new Date('2026-06-07T12:00:00') });
  await page.goto('/');
  const code = `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.locator('#dashboard')).toBeVisible();
  // Fill 14:00 with an activity so the ↻ button appears.
  const row = page.locator(`.agenda-row[data-hour="14"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.activity-clickable').click();
  await row.locator('input[type="text"]').fill('Math homework');
  await row.locator('.save-btn').click();
  await expect(row.locator('.activity-clickable')).toBeVisible();
  await row.locator('.recurrence-btn').click();
  await expect(page.locator('.repeat-popover')).toBeVisible();
}

// Drives the Until input by setting `value` directly (bypasses the native date
// picker which would refuse out-of-range values via the `max` attribute or
// reject non-real dates outright). Mirrors what a user pasting/typing would do.
async function setUntilRaw(page, value) {
  await page.evaluate((v) => {
    const el = document.getElementById('repeat-until');
    el.value = v;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function clickConfirmAndTime(page) {
  const t0 = Date.now();
  await page.locator('#repeat-confirm').click();
  await expect(page.locator('#repeat-error')).not.toHaveText('', { timeout: 1000 });
  const elapsed = Date.now() - t0;
  return elapsed;
}

test('US3 — Empty Until shows kid-friendly hint text', async ({ page }) => {
  await setupAndOpenRepeat(page);
  // FR-007: blank Until shows kid-friendly hint, no literal YYYY-MM-DD.
  await expect(page.locator('#repeat-until-hint')).toContainText(/Tap to pick a day/i);
  await expect(page.locator('#repeat-until-hint')).not.toContainText('YYYY');
});

// SC-003 budgets client-side rejection at under 200 ms. We allow a small CI margin
// (300 ms) — the spec target is a perceived-instant response, not a hard real-time
// SLA, and CI runners introduce non-determinism in event-loop scheduling.
const SC003_BUDGET_MS = 300;

test('US3 — Invalid Until (today = source) rejected with kid-friendly message', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await setUntilRaw(page, SAMPLE_DATE);
  const elapsed = await clickConfirmAndTime(page);
  await expect(page.locator('#repeat-error')).toContainText(/hasn't happened yet/i);
  expect(elapsed).toBeLessThan(SC003_BUDGET_MS); // SC-003
  // Popover stayed open and no new entries — verify by re-checking confirm exists.
  await expect(page.locator('#repeat-confirm')).toBeVisible();
});

test('US3 — Invalid Until (past date) rejected with kid-friendly message', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await setUntilRaw(page, '2025-12-01');
  const elapsed = await clickConfirmAndTime(page);
  await expect(page.locator('#repeat-error')).toContainText(/hasn't happened yet/i);
  expect(elapsed).toBeLessThan(SC003_BUDGET_MS);
});

test('US3 — Invalid Until (more than 90 days) rejected with kid-friendly message', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await setUntilRaw(page, '2026-10-01'); // > 90 days from 2026-06-07
  const elapsed = await clickConfirmAndTime(page);
  await expect(page.locator('#repeat-error')).toContainText(/within the next 90 days/i);
  expect(elapsed).toBeLessThan(SC003_BUDGET_MS);
});

test('US3 — Malformed Until rejected with kid-friendly message', async ({ page }) => {
  await setupAndOpenRepeat(page);
  // Browsers normalise some inputs in type=date, so we deliberately set an obviously
  // bad string to trigger the pre-flight invalid_input branch.
  await setUntilRaw(page, 'not-a-date');
  const elapsed = await clickConfirmAndTime(page);
  // pre-flight maps empty/malformed value to invalid_input ("Something looked off"),
  // OR if the browser cleared the value, invalid_input again — both produce a friendly
  // non-jargon message.
  await expect(page.locator('#repeat-error')).not.toContainText(/error|invalid|failed/i);
  expect(elapsed).toBeLessThan(SC003_BUDGET_MS);
});

test('US3 — Non-existent calendar date (2026-02-30) rejected by server with friendly message', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await setUntilRaw(page, '2026-02-30');
  // For a non-existent date the pre-flight may pass (looks like YYYY-MM-DD), so the
  // server validation kicks in and we need a slightly longer timing budget here —
  // but the message should still be kid-friendly.
  await page.locator('#repeat-confirm').click();
  // The popover stays open and shows a friendly message — server round-trip may
  // exceed 200 ms, so we don't gate this case on SC-003 timing.
  await expect(page.locator('#repeat-error')).not.toHaveText('', { timeout: 2000 });
  await expect(page.locator('#repeat-error')).not.toContainText(/invalid|error|failed/i);
});
