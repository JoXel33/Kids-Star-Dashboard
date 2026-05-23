import { test, expect } from '@playwright/test';

test('US1 — first-use setup, greeting/calendar/agenda render, save an activity', async ({ page }) => {
  await page.goto('/');

  // First-use setup with a unique code (E2E DB persists across runs)
  const code = `mer-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();

  // Greeting shows the name; calendar highlights today
  await expect(page.locator('.greeting-card .name')).toHaveText(/Mia/);
  await expect(page.locator('.calendar-grid .day.today.selected')).toBeVisible();

  // Agenda renders all 14 blocks
  await expect(page.locator('.agenda-row')).toHaveCount(14);

  // Save an activity on the first non-elapsed block
  const firstUpcomingEdit = page.locator('.agenda-row:not(.elapsed) .edit-btn').first();
  await firstUpcomingEdit.click();
  await page.locator('.agenda-row input[type="text"]').fill('Reading time');
  await page.locator('.agenda-row .save-btn').click();

  // Activity persists across reload
  await page.reload();
  await expect(page.locator('.agenda-row .activity', { hasText: 'Reading time' })).toBeVisible();
});
