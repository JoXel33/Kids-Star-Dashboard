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

test('US3 (FR-029) — redeem when affordable: want removed, balance updates', async ({ page }) => {
  page.on('dialog', (d) => d.accept());

  // Day 1 (2026-05-20, 20:00): sign up and earn a star.
  await page.clock.install({ time: new Date('2026-05-20T20:00:00') });
  await page.goto('/');

  const code = `red-${Date.now().toString(36)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  await page.locator('.star-btn').click();
  await expect(page.locator('.star-btn')).toHaveText(/⭐/);

  // Day 4 (2026-05-23, noon): 5/20 is now a past day with earned=1 → starsCollected=1, balance=1.
  await page.clock.setSystemTime(new Date('2026-05-23T12:00:00'));
  await page.reload();
  await expect(page.locator('.wallet-num').first()).toHaveText('1', { timeout: 5_000 });

  // Add a 1-star reward; redeem button now shows because balance (1) >= cost (1).
  await page.getByRole('button', { name: /add a reward/i }).click();
  await page.locator('#new-desc').fill('Sticker');
  await page.locator('.cost-btn[data-cost="1"]').click();
  await page.locator('#add-confirm').click();

  const row = page.locator('.reward-row', { hasText: 'Sticker' });
  await expect(row).toBeVisible();
  await expect(row.locator('.redeem-btn')).toBeVisible();

  // Redeem → row disappears, balance drops to 0, starsCollected stays at 1.
  await row.locator('.redeem-btn').click();
  await expect(page.locator('.reward-row')).toHaveCount(0);
  await expect(page.locator('.wallet-num').first()).toHaveText('1');  // starsCollected
  await expect(page.locator('.wallet-num').nth(1)).toHaveText('0');  // starBalance
});
