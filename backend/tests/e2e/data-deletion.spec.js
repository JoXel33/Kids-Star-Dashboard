import { test, expect } from '@playwright/test';

test('Data deletion — settings gear opens modal, deletes data, returns to first-use', async ({ page }) => {
  await page.goto('/');

  const code = `del-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();

  // Dashboard loaded; settings FAB visible
  await expect(page.locator('.settings-fab')).toBeVisible();

  // Accept the native confirm() prompt
  page.on('dialog', (d) => d.accept());

  // Open the settings modal and click Delete my data
  await page.locator('.settings-fab').click();
  await expect(page.locator('.modal-card')).toBeVisible();
  await page.locator('#modal-delete').click();

  // After deletion the page reloads and the first-use auth screen returns
  await expect(page.getByRole('button', { name: /set me up/i })).toBeVisible({ timeout: 5_000 });

  // Logging in with the same access code should now fail (account deleted)
  await page.getByRole('button', { name: /i have a code/i }).click();
  await page.getByLabel(/Your code/i).fill(code);
  await page.getByRole('button', { name: /let me in/i }).click();
  await expect(page.locator('#login-error')).toContainText(/doesn't match/i);
});
