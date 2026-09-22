import { _electron as electron, expect, test } from '@playwright/test';
import { packagedAppPath } from './packagedApp';

// The Chromium sandbox needs privileges that CI containers do not grant.
const args = process.env.CI ? ['--no-sandbox'] : [];

test('shows the machine name', async () => {
  const app = await electron.launch({ executablePath: packagedAppPath(), args });

  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('heading', { name: 'Navy Enigma' })).toBeVisible();
  } finally {
    await app.close();
  }
});
