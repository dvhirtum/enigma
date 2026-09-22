import { expect, test } from '@playwright/test';

test('shows the machine name', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Navy Enigma' })).toBeVisible();
});
