import { test, expect } from '@playwright/test';

// Constitution Principle IV + T029: the Repeat popover must be keyboard-navigable
// and carry descriptive labels on every interactive control.

async function setupAndOpenRepeat(page) {
  await page.clock.install({ time: new Date('2026-06-07T12:00:00') });
  await page.goto('/');
  const code = `a-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  await page.getByRole('button', { name: /set me up/i }).click();
  await page.getByLabel(/Your name/i).fill('Mia');
  await page.getByLabel(/Your secret code/i).fill(code);
  await page.getByLabel(/name of your school/i).fill('Coral School');
  await page.getByRole('button', { name: /let's go/i }).click();
  await expect(page.locator('#dashboard')).toBeVisible();
  const row = page.locator(`.agenda-row[data-hour="14"]`);
  await row.scrollIntoViewIfNeeded();
  await row.locator('.activity-clickable').click();
  await row.locator('input[type="text"]').fill('Math homework');
  await row.locator('.save-btn').click();
  await expect(row.locator('.activity-clickable')).toBeVisible();
  await row.locator('.recurrence-btn').click();
  await expect(page.locator('.repeat-popover')).toBeVisible();
}

test('a11y — popover wrapper carries role/aria-modal/aria-labelledby', async ({ page }) => {
  await setupAndOpenRepeat(page);
  const popover = page.locator('.repeat-popover');
  await expect(popover).toHaveAttribute('role', 'dialog');
  await expect(popover).toHaveAttribute('aria-modal', 'true');
  await expect(popover).toHaveAttribute('aria-labelledby', 'repeat-popover-title');
  // The labelledby target exists and is the popover's heading.
  await expect(page.locator('#repeat-popover-title')).toBeVisible();
});

test('a11y — every interactive control has an accessible name', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await expect(page.locator('.recurrence-btn')).toHaveAttribute('aria-label', 'Repeat this activity');
  await expect(page.locator('#repeat-confirm')).toHaveAttribute('aria-label', 'Confirm repeat');
  // The Until input is associated with a visible <label for="repeat-until">.
  await expect(page.locator('label[for="repeat-until"]')).toBeVisible();
  await expect(page.locator('#repeat-until')).toHaveAttribute('aria-describedby', 'repeat-until-hint');
  // The "Not now" button has a textual label that screen readers will announce.
  await expect(page.locator('#repeat-cancel')).toHaveText(/Not now/);
});

test('a11y — focus is trapped inside the popover under repeated Tab and Shift+Tab', async ({ page }) => {
  await setupAndOpenRepeat(page);
  // The Until input is auto-focused on mount.
  await expect(page.locator('#repeat-until')).toBeFocused();

  // Walk the focus ring several times in both directions. The exact order can
  // vary slightly with browser radio-group behaviour, but the focus trap MUST
  // keep the active element inside the popover the whole time.
  const insidePopover = () => page.evaluate(
    () => document.activeElement?.closest('.repeat-popover') !== null,
  );
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await insidePopover()).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Shift+Tab');
    expect(await insidePopover()).toBe(true);
  }
});

test('a11y — Escape closes the popover (acts as Not now)', async ({ page }) => {
  await setupAndOpenRepeat(page);
  await page.keyboard.press('Escape');
  await expect(page.locator('.repeat-popover')).toHaveCount(0);
});
