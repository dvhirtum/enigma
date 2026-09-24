import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { _electron as electron, expect, test, type ElectronApplication, type Page } from '@playwright/test';
import type { KeySheetFile } from '../src/api';

// Runs the Vite build in `.vite/build`; run `npm run package` first.
// Uses a temporary user data folder, so key sheets and settings stay out of the real one.
let app: ElectronApplication;
let userData: string;
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
  userData = mkdtempSync(path.join(os.tmpdir(), 'enigma-e2e-'));
  app = await electron.launch({ args: ['.', `--user-data-dir=${userData}`] });
  page = await app.firstWindow();
  await expect(page.getByRole('tablist', { name: 'Views' })).toBeVisible({ timeout: 90_000 });
});

test.afterAll(async () => {
  await app.close();
  rmSync(userData, { recursive: true, force: true, maxRetries: 5 });
});

test('keeps its data in the temporary user data folder', async () => {
  expect(await app.evaluate(({ app }) => app.getPath('userData'))).toBe(userData);
});

test('shows the default machine and the backend version', async () => {
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
  await expect(page.getByText(/^Backend v.+/)).toBeVisible();
});

test('switches between the views', async () => {
  await page.getByRole('tab', { name: 'Open lid' }).click();

  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Open lid');
});

test('shows the user guide and follows its links', async () => {
  await page.getByRole('tab', { name: 'Instructions' }).click();
  const guide = page.getByRole('article', { name: 'Instructions' });
  await expect(guide.getByRole('heading', { level: 1 })).toHaveText('Enigma user guide');

  await guide.getByRole('link', { name: 'Key sheets' }).click();

  await expect(guide.getByRole('heading', { level: 1 })).toHaveText('Key sheets');
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

test('generates a key sheet, applies a daily key and deletes the sheet', async () => {
  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });

  await panel.getByRole('button', { name: 'Generate' }).click();
  const form = panel.getByRole('form', { name: 'Generate key sheet' });
  await form.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await form.getByRole('textbox', { name: 'Network' }).fill('E2E');
  await form.getByLabel('Month').fill('1944-02');
  await form.getByRole('button', { name: 'Generate' }).click();

  const day = panel.getByRole('listitem', { name: 'Day 29' });
  await expect(day).toContainText(/UKW (B|C)-thin/);
  await day.getByRole('button', { name: 'Apply' }).click();
  await day.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText(/^M4 · UKW (B|C)-thin · (Beta|Gamma) /);
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: E2E 1944-02, day 29 · Grundstellung [A-Z]{4}$/);
  await expect(day).toContainText('Applied');

  await panel.getByRole('button', { name: 'Delete' }).click();
  await panel.getByRole('group', { name: 'Confirm delete' }).getByRole('button', { name: 'Delete' }).click();
  await expect(panel.getByRole('option', { name: /^E2E 1944-02/ })).toHaveCount(0);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveCount(0);
});

test('exports a key sheet with its Kenngruppenbuch and Tauschtafeln', async () => {
  const generated = await page.evaluate(() => window.enigma.keySheets.generate('M3', 'Export', '1944-03'));
  if (!generated.ok) {
    throw new Error(generated.problem.title);
  }
  const file = path.join(userData, 'export.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath });
  }, file);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });
  await panel.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Export 1944-03 · M3 (generated)' });
  await panel.getByRole('button', { name: 'Export' }).click();

  await expect.poll(() => existsSync(file)).toBe(true);
  const exported = JSON.parse(readFileSync(file, 'utf8')) as KeySheetFile;
  expect(exported.kenngruppenbuch?.id).toBe(generated.value.kenngruppenbuchId);
  expect(exported.kenngruppenbuch?.columns).toHaveLength(676);
  expect(exported.tauschtafeln?.id).toBe(generated.value.tauschtafelSetId);
  expect(exported.tauschtafeln?.tables).toHaveLength(9);

  await page.evaluate((id) => window.enigma.keySheets.remove(id), generated.value.id);
  await page.getByRole('button', { name: 'Key sheets' }).click();
});

test('prints a key sheet with its Kenngruppenbuch and Tauschtafeln to a PDF', async () => {
  const generated = await page.evaluate(() => window.enigma.keySheets.generate('M4', 'Print', '1944-06'));
  if (!generated.ok) {
    throw new Error(generated.problem.title);
  }
  const file = path.join(userData, 'print.pdf');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath });
  }, file);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });
  await panel.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Print 1944-06 · M4 (generated)' });
  await panel.getByRole('button', { name: 'Print to PDF' }).click();

  await expect.poll(() => existsSync(file) && readFileSync(file, 'latin1').trimEnd().endsWith('%%EOF'), { timeout: 30_000 }).toBe(true);
  const pdf = readFileSync(file, 'latin1');
  expect(pdf.startsWith('%PDF-')).toBe(true);
  expect(pdf).toContain('SpecialElite');
  expect(pdf).toContain('CourierPrime');
  expect(pdf.match(/\/Type\s*\/Page\b/g)?.length).toBeGreaterThan(40);

  await page.evaluate((id) => window.enigma.keySheets.remove(id), generated.value.id);
  await page.getByRole('button', { name: 'Key sheets' }).click();
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

/** Turns the rotors in the top-down view until the windows show `letters`, left to right. */
async function setRotors(letters: string): Promise<void> {
  for (const [index, slot] of ['Left', 'Middle', 'Right'].entries()) {
    const rotor = page.getByRole('spinbutton', { name: `${slot} rotor` });
    let current = await rotor.getAttribute('aria-valuetext');
    for (let turns = 0; current !== letters[index] && turns < 26; turns++) {
      await rotor.press('ArrowUp');
      await expect(rotor).not.toHaveAttribute('aria-valuetext', current!);
      current = await rotor.getAttribute('aria-valuetext');
    }
    await expect(rotor).toHaveAttribute('aria-valuetext', letters[index]);
  }
}

async function typeLetters(letters: string): Promise<void> {
  for (const letter of letters.toLowerCase()) {
    await page.keyboard.press(letter);
  }
}

test('sends a message with the indicator procedure and receives it again', async () => {
  await page.getByRole('button', { name: 'Key sheets' }).click();
  const sheets = page.getByRole('complementary', { name: 'Key sheets' });
  await sheets.getByRole('button', { name: 'Generate' }).click();
  const form = sheets.getByRole('form', { name: 'Generate key sheet' });
  await form.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await form.getByRole('textbox', { name: 'Network' }).fill('Triton');
  await form.getByLabel('Month').fill('1944-03');
  await form.getByRole('button', { name: 'Generate' }).click();
  await sheets.getByRole('listitem', { name: 'Day 1', exact: true }).getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: Triton 1944-03, day 1 · Grundstellung [A-Z]{3}$/);

  await page.getByRole('button', { name: 'Operator mode' }).click();
  const panel = page.getByRole('complementary', { name: 'Operator mode' });
  await page.getByRole('tab', { name: 'Top-down' }).click();

  const runMessageKey = async () => {
    const meta = await panel.getByText(/· Grundstellung [A-Z]{3}$/).textContent();
    await setRotors(meta!.slice(-3));
    const verfahren = (await panel.getByRole('region', { name: 'Indicator' }).locator('.indicator-rows span').nth(1).textContent())!.replace(/ /g, '');
    await typeLetters(verfahren.slice(0, 3));
    const spruchschluessel = (await panel.getByText(/^Spruchschlüssel [A-Z]{3}$/).textContent())!.slice(-3);
    await setRotors(spruchschluessel);
    await expect(panel.locator('[aria-current="step"]')).toHaveText('Type the message');
  };

  await panel.getByRole('button', { name: 'Send a message' }).click();
  await panel.getByRole('button', { name: 'Random' }).click();
  await panel.getByRole('button', { name: 'Encrypt indicator' }).click();
  await runMessageKey();
  await typeLetters('WETTERXX');
  await panel.getByRole('button', { name: 'Finish' }).click();
  const message = (await panel.getByRole('status', { name: 'Radio message' }).textContent())!;
  expect(message).toMatch(/^\d{4} = 24 = ([A-Z]{4} ){5}[A-Z]{4}$/);
  await panel.getByRole('button', { name: 'Copy' }).click();
  await expect(panel.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe(message);

  await panel.getByRole('button', { name: 'New message' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveCount(0);
  await panel.getByRole('textbox', { name: 'Received message' }).fill(message);
  await panel.getByLabel('Date').fill('1944-03-01');
  await panel.getByRole('button', { name: 'Find key' }).click();
  await panel.getByRole('list', { name: 'Matching keys' }).getByRole('button', { name: 'Receive with this key' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: Triton 1944-03, day 1 · Grundstellung [A-Z]{3}$/);
  await runMessageKey();
  const cipher = message.split(' = ')[2].split(' ').slice(2, 4).join('');
  await typeLetters(cipher);

  await expect(panel.getByRole('region', { name: 'Message pad' })).toContainText('WETT ERXX');
  await panel.getByRole('button', { name: 'New message' }).click();
  await page.getByRole('button', { name: 'Operator mode' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await page.getByRole('button', { name: 'Switch' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
});

test('restarts the backend after it stops', async () => {
  test.skip(process.platform !== 'win32', 'Finds the backend process with PowerShell.');

  killBackend(app.process().pid!);
  await expect(page.getByRole('alert')).toContainText('The backend stopped', { timeout: 30_000 });
  await page.getByRole('button', { name: 'Restart' }).click();

  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III', { timeout: 90_000 });
});
