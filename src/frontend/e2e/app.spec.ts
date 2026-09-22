import { _electron as electron, expect, test } from '@playwright/test';
import { packagedAppPath } from './packagedApp';

test('shows the machine name', async () => {
  const app = await electron.launch({ executablePath: packagedAppPath() });

  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('heading', { name: 'Navy Enigma' })).toBeVisible();
  } finally {
    await app.close();
  }
});
