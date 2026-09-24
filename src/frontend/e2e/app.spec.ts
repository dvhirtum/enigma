import { execFileSync } from 'node:child_process';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';

// Runs the Vite build in `.vite/build`; run `npm run package` first.
let app: ElectronApplication;
let page: Page;

// Kills the Enigma.Api process started by this Electron instance.
function killBackend(electronPid: number): void {
  const script = `
    $all = Get-CimInstance Win32_Process
    $ids = @(${electronPid})
    do {
      $count = $ids.Count
      $ids = @($ids + ($all | Where-Object { $ids -contains $_.ParentProcessId } | ForEach-Object ProcessId) | Select-Object -Unique)
    } while ($ids.Count -gt $count)
    $all | Where-Object { $_.Name -like 'Enigma.Api*' -and $ids -contains $_.ProcessId } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }`;
  execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script]);
}

test.beforeAll(async () => {
  app = await electron.launch({ args: ['.'] });
  page = await app.firstWindow();
  await expect(page.getByRole('tablist', { name: 'Views' })).toBeVisible({ timeout: 90_000 });
});

test.afterAll(async () => {
  await app.close();
});

test('shows the default machine and the backend version', async () => {
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
  await expect(page.getByText(/^Backend v.+/)).toBeVisible();
});

test('switches between the views', async () => {
  await page.getByRole('tab', { name: 'Open lid' }).click();

  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Open lid');
});

test('lights a lamp while a key is held on the physical keyboard', async () => {
  await page.getByRole('tab', { name: 'Top-down' }).click();

  await page.keyboard.down('a');
  await expect(page.getByRole('img', { name: 'Lamp B, lit' })).toBeVisible();
  await expect(page.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'B');
  await page.keyboard.up('a');

  await expect(page.getByRole('img', { name: /lit$/ })).toHaveCount(0);
});

test('turns a rotor with the thumbwheel', async () => {
  await page.getByTestId('thumbwheel-Right-down').click();

  await expect(page.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'A');
});

test('moves a rotor to the box, sets its ring and puts it back', async () => {
  await page.getByRole('tab', { name: 'Open lid' }).click();

  await page.getByRole('spinbutton', { name: /^Left slot/ }).click();
  await page.getByRole('spinbutton', { name: 'Rotor I in the box, ring' }).press('ArrowUp');
  await expect(page.getByRole('spinbutton', { name: 'Rotor I in the box, ring' })).toHaveAttribute('aria-valuetext', '02 (B)');
  await page.getByRole('spinbutton', { name: 'Rotor I in the box, ring' }).click();
  await page.getByRole('button', { name: 'Left slot: empty' }).click();

  await expect(page.getByRole('spinbutton', { name: 'Left slot: rotor I, ring 02 (B)' })).toBeVisible();
});

test('plugs a cable on the plugboard, moves it and removes it', async () => {
  await page.getByRole('tab', { name: 'Plugboard' }).click();

  await page.getByRole('button', { name: 'Socket A', exact: true }).dragTo(page.getByRole('button', { name: 'Socket T', exact: true }));
  await expect(page.getByRole('button', { name: 'Socket A, plugged to T' })).toBeVisible();
  await expect(page.getByLabel('Cables')).toHaveText('AT · 1 of 13');

  await page.getByRole('button', { name: 'Socket A, plugged to T' }).dragTo(page.getByRole('button', { name: 'Socket C', exact: true }));
  await expect(page.getByLabel('Cables')).toHaveText('CT · 1 of 13');

  await page.getByRole('button', { name: 'Socket T, plugged to C' }).click();
  await expect(page.getByLabel('Cables')).toHaveText('No cables · 0 of 13');
});

test('switches to the M4 and back', async () => {
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText('M4 · UKW B-thin · Beta I II III');

  await page.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
});

test('forwards machine operations to the backend', async () => {
  const pressed = await page.evaluate(async () => {
    const result = await window.enigma.machine.pressKey('A');
    await window.enigma.machine.releaseKey();
    return result;
  });

  expect(pressed).toMatchObject({ ok: true, value: { litLamp: 'B', heldKey: 'A' } });
});

test('runs machine operations in the order they were sent', async () => {
  const results = await page.evaluate(() =>
    Promise.all([window.enigma.machine.pressKey('A'), window.enigma.machine.releaseKey()]),
  );

  expect(results).toMatchObject([
    { ok: true, value: { heldKey: 'A' } },
    { ok: true, value: { heldKey: null, litLamp: null } },
  ]);
});

test('returns rejected operations as problems', async () => {
  const result = await page.evaluate(() => window.enigma.machine.connectPlug('AA'));

  expect(result).toMatchObject({ ok: false, problem: { status: 400 } });
});

test('applies a content security policy', async () => {
  const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

  expect(policy).toContain("default-src 'none'");
});

test('blocks new windows', async () => {
  const opened = await page.evaluate(() => window.open('https://example.com') !== null);

  expect(opened).toBe(false);
  expect(app.windows()).toHaveLength(1);
});

test('restarts the backend after it stops', async () => {
  test.skip(process.platform !== 'win32', 'Finds the backend process with PowerShell.');

  killBackend(app.process().pid!);
  await expect(page.getByRole('alert')).toContainText('The backend stopped', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III', { timeout: 90_000 });
});
