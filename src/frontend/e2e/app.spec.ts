import { _electron as electron, expect, test } from '@playwright/test';

// Runs the Vite build in `.vite/build`; run `npm run package` first.
test('connects to the backend on startup', async () => {
  const app = await electron.launch({ args: ['.'] });

  try {
    const window = await app.firstWindow();

    await expect(window.getByRole('status')).toHaveText(/Backend connected \(v.+\)/, { timeout: 90_000 });
  } finally {
    await app.close();
  }
});
