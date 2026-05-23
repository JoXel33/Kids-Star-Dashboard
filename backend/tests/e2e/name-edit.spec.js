import { test, expect } from '@playwright/test';

test('Name edit — click the name in greeting, change it, save, persists across reload', async ({ page }) => {
  await page.goto('/');

  const code = `nme-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();

  await expect(page.locator('.greeting-card .name')).toHaveText('Mia');

  // Click the name to edit
  await page.locator('.greeting-card .name').click();
  const input = page.locator('.name-input');
  await expect(input).toBeVisible();
  await input.fill('Mia Rose');
  await page.locator('.name-save-btn').click();

  await expect(page.locator('.greeting-card .name')).toHaveText('Mia Rose');

  // Persists across reload
  await page.reload();
  await expect(page.locator('.greeting-card .name')).toHaveText('Mia Rose');
});
