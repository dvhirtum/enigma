import { _electron as electron, expect, test } from '@playwright/test';
import { packagedAppPath } from './packagedApp';

// The Chromium sandbox and GPU need privileges that CI containers do not grant.
const args = process.env.CI ? ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] : [];

test('shows the machine name', async () => {
  const app = await electron.launch({ executablePath: packagedAppPath(), args });

  app.process().stdout?.on('data', (chunk) => console.log(`[main] ${chunk}`));
  app.process().stderr?.on('data', (chunk) => console.log(`[main] ${chunk}`));

  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('heading', { name: 'Navy Enigma' })).toBeVisible();
  } finally {
    await app.close();
  }
});
