import { test, expect } from '@playwright/test';

test('US3 — add a reward, remove it; redeem button hidden when unaffordable', async ({ page }) => {
  await page.goto('/');

  const code = `us3-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();

  // Empty state visible
  await expect(page.locator('.empty-note')).toBeVisible();

  // Add a 3-star reward
  await page.getByRole('button', { name: /add a reward/i }).click();
  await page.locator('#new-desc').fill('Ice cream');
  await page.locator('.cost-btn[data-cost="3"]').click();
  await page.locator('#add-confirm').click();

  // Reward appears
  const row = page.locator('.reward-row', { hasText: 'Ice cream' });
  await expect(row).toBeVisible();
  await expect(row.locator('.reward-cost')).toContainText('⭐⭐⭐');

  // Can't afford it yet (balance = 0) — redeem button is absent
  await expect(row.locator('.redeem-btn')).toHaveCount(0);

  // Remove it (confirmation auto-accepted via dialog handler)
  page.on('dialog', (d) => d.accept());
  await row.locator('.remove-btn').click();
  await expect(page.locator('.reward-row')).toHaveCount(0);
});
