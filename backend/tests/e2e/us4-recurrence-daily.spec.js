import { test, expect } from '@playwright/test';

const SAMPLE_DATE = '2026-06-07'; // Sunday at noon (page.clock).
const NON_ELAPSED_HOURS = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const ELAPSED_HOURS = [7, 8, 9, 10, 11];

async function setupChild(page, { name = 'Mia', activityHour = null, activity = 'Math homework' } = {}) {
  await page.clock.install({ time: new Date('2026-06-07T12:00:00') });
  await page.goto('/');
  const code = `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill(name);
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  // Dashboard should be visible.
  await expect(page.locator('#dashboard')).toBeVisible();

  if (activityHour !== null) {
    await fillAgendaRow(page, activityHour, activity);
  }
}

async function fillAgendaRow(page, hour, activity) {
  const row = page.locator(`.agenda-row[data-hour="${hour}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.activity-clickable').click();
  const input = row.locator('input[type="text"]');
  await input.fill(activity);
  await row.locator('.save-btn').click();
  // Wait for the row to leave edit mode by polling for activity-clickable visibility.
  await expect(row.locator('.activity-clickable')).toBeVisible();
}

test('US1 — Daily recurrence: happy path + SC-001 timing', async ({ page }) => {
  await setupChild(page, { activityHour: 14, activity: 'Math homework' });

  // The ↻ icon should now be visible on the filled, non-elapsed row.
  const row14 = page.locator('.agenda-row[data-hour="14"]');
  await expect(row14.locator('.recurrence-btn')).toBeVisible();

  // Click ↻ → popover opens with heading + How often? + Until + Confirm/Not now.
  await row14.locator('.recurrence-btn').click();
  await expect(page.locator('.repeat-popover')).toBeVisible();
  await expect(page.locator('#repeat-popover-title')).toHaveText(/Repeat/);
  await expect(page.locator('input[name="repeat-type"][value="daily"]')).toBeChecked();

  // Pick Until = 2026-06-10 via the native date input.
  await page.locator('#repeat-until').fill('2026-06-10');

  // SC-001 — Confirm → popover closes within 2 s.
  const t0 = Date.now();
  await page.locator('#repeat-confirm').click();
  await expect(page.locator('.repeat-popover')).toBeHidden({ timeout: 2500 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(2000);

  // Navigate to each target date and assert the activity is present.
  for (const targetDate of ['2026-06-08', '2026-06-09', '2026-06-10']) {
    await page.locator(`.calendar-grid .day[data-date="${targetDate}"]`).click();
    await expect(
      page.locator(`.agenda-row[data-hour="14"] .activity`, { hasText: 'Math homework' }),
    ).toBeVisible({ timeout: 2000 });
  }

  // Source date — activity unchanged.
  await page.locator(`.calendar-grid .day[data-date="${SAMPLE_DATE}"]`).click();
  await expect(
    page.locator(`.agenda-row[data-hour="14"] .activity`, { hasText: 'Math homework' }),
  ).toBeVisible();
});

test('SC-004 — ↻ affordance gating across all 14 hour-blocks', async ({ page }) => {
  await setupChild(page);

  // (a) Elapsed rows (07:00–11:00) — assert ↻ icon ABSENT regardless of content.
  for (const h of ELAPSED_HOURS) {
    const row = page.locator(`.agenda-row[data-hour="${h}"]`);
    await expect(row).toHaveClass(/elapsed/);
    await expect(row.locator('.recurrence-btn')).toHaveCount(0);
  }

  // (b) Non-elapsed rows (12:00–20:00) — fill each, assert ↻ icon PRESENT.
  for (const h of NON_ELAPSED_HOURS) {
    await fillAgendaRow(page, h, `Activity ${h}`);
    const row = page.locator(`.agenda-row[data-hour="${h}"]`);
    await expect(row.locator('.recurrence-btn')).toBeVisible();
  }

  // (c) Clear one non-elapsed row (h=14) — assert ↻ icon DISAPPEARS.
  const row14 = page.locator('.agenda-row[data-hour="14"]');
  await row14.locator('.activity-clickable').click();
  const input = row14.locator('input[type="text"]');
  await input.fill('');
  await row14.locator('.save-btn').click();
  await expect(row14.locator('.activity-clickable')).toBeVisible();
  await expect(row14.locator('.recurrence-btn')).toHaveCount(0);
});
