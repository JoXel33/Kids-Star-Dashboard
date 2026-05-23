import { test, expect } from '@playwright/test';

test('US2 — toggle today\'s star, wallet renders, past-date star read-only', async ({ page }) => {
  // Freeze browser clock at noon so the star is well before its 21:30 lock time.
  await page.clock.install({ time: new Date('2026-05-23T12:00:00') });
  await page.goto('/');

  const code = `us2-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();

  // Wallet renders (Stars Collected + Star Balance, both 0)
  await expect(page.locator('.wallet-num').first()).toHaveText('0');

  // Star starts as ☆ (not earned). Toggle to ⭐.
  const star = page.locator('.star-btn');
  await expect(star).toHaveText(/☆/);
  await star.click();
  await expect(page.locator('.star-btn')).toHaveText(/⭐/);
  await expect(page.locator('.star-status')).toContainText(/Star earned/);

  // Toggle back off
  await page.locator('.star-btn').click();
  await expect(page.locator('.star-btn')).toHaveText(/☆/);

  // Navigate to yesterday in the calendar — past-date star is locked/read-only
  await page.locator('.calendar-grid .day.today').click();         // ensure today selected first
  // Click any other day in the visible month
  const otherDay = page.locator('.calendar-grid .day[data-date]:not(.today)').first();
  await otherDay.click();
  await expect(page.locator('.star-btn')).toBeDisabled();
});
