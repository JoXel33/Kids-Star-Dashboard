import { test, expect } from '@playwright/test';

// Quick affordance check for the ✕ remove button on filled, non-elapsed agenda rows.

async function setupChild(page) {
  await page.clock.install({ time: new Date('2026-06-07T12:00:00') });
  await page.goto('/');
  const code = `rm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.locator('#dashboard')).toBeVisible();
}

async function fillRow(page, hour, activity) {
  const row = page.locator(`.agenda-row[data-hour="${hour}"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.activity-clickable').click();
  await row.locator('input[type="text"]').fill(activity);
  await row.locator('.save-btn').click();
  await expect(row.locator('.activity-clickable')).toBeVisible();
}

test('Remove ✕ — appears on filled non-elapsed rows only, and removes the activity on click', async ({ page }) => {
  await setupChild(page);
  // Empty row: no ✕.
  const empty = page.locator(`.agenda-row[data-hour="15"]`);
  await expect(empty.locator('.remove-btn')).toHaveCount(0);

  // Elapsed row: no ✕ regardless of content.
  for (const h of [7, 8, 9, 10, 11]) {
    await expect(page.locator(`.agenda-row[data-hour="${h}"] .remove-btn`)).toHaveCount(0);
  }

  // Fill 14:00 → ✕ appears next to ↻.
  await fillRow(page, 14, 'Math homework');
  const row14 = page.locator(`.agenda-row[data-hour="14"]`);
  await expect(row14.locator('.recurrence-btn')).toBeVisible();
  await expect(row14.locator('.remove-btn')).toBeVisible();
  await expect(row14.locator('.remove-btn')).toHaveText(/✕/);

  // Click ✕ → activity disappears, ↻ and ✕ both go away.
  await row14.locator('.remove-btn').click();
  await expect(row14.locator('.activity-clickable')).toContainText(/tap to add/i, { timeout: 2000 });
  await expect(row14.locator('.recurrence-btn')).toHaveCount(0);
  await expect(row14.locator('.remove-btn')).toHaveCount(0);
});
