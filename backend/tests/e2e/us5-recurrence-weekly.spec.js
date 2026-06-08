import { test, expect } from '@playwright/test';

// 2026-06-07 is a Sunday (per spec US1 AC1).
async function setupChildAndActivity(page, { hour = 14, activity = 'Family lunch' } = {}) {
  await page.clock.install({ time: new Date('2026-06-07T12:00:00') });
  await page.goto('/');
  const code = `w-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.locator('#dashboard')).toBeVisible();
  // Fill the activity.
  const row = page.locator(`.agenda-row[data-hour="${hour}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.activity-clickable').click();
  await row.locator('input[type="text"]').fill(activity);
  await row.locator('.save-btn').click();
  await expect(row.locator('.activity-clickable')).toBeVisible();
}

test('US2 — Weekly recurrence: label reads "Every Sunday" + SC-002 timing', async ({ page }) => {
  await setupChildAndActivity(page);
  const row14 = page.locator('.agenda-row[data-hour="14"]');
  await row14.locator('.recurrence-btn').click();
  await expect(page.locator('.repeat-popover')).toBeVisible();

  // The second radio option must reflect the source date's day-of-week.
  const weeklyOption = page.locator('input[name="repeat-type"][value="weekly"]');
  await expect(weeklyOption).toBeVisible();
  const weeklyLabel = page.locator('label', { has: weeklyOption });
  await expect(weeklyLabel).toContainText('Every Sunday');

  await weeklyOption.check();
  await page.locator('#repeat-until').fill('2026-06-28');

  // SC-002 — Confirm → popover closes within 2 s.
  const t0 = Date.now();
  await page.locator('#repeat-confirm').click();
  await expect(page.locator('.repeat-popover')).toBeHidden({ timeout: 2500 });
  expect(Date.now() - t0).toBeLessThan(2000);

  // Matching Sundays in range each show the activity.
  for (const sunday of ['2026-06-14', '2026-06-21', '2026-06-28']) {
    await page.locator(`.calendar-grid .day[data-date="${sunday}"]`).click();
    await expect(
      page.locator(`.agenda-row[data-hour="14"] .activity`, { hasText: 'Family lunch' }),
    ).toBeVisible({ timeout: 2000 });
  }

  // A Wednesday between is empty.
  await page.locator(`.calendar-grid .day[data-date="2026-06-17"]`).click();
  await expect(
    page.locator(`.agenda-row[data-hour="14"] .activity .activity-clickable em`),
  ).not.toBeVisible({ timeout: 500 }).catch(() => {});
  // More robust: assert there's no recurrence-btn (= no activity).
  await expect(
    page.locator(`.agenda-row[data-hour="14"] .recurrence-btn`),
  ).toHaveCount(0);
});
