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
  await expect(page.getByRole('contentinfo')).toHaveText(/^Backend v.+/);
});

test('switches between the views', async () => {
  await page.getByRole('tab', { name: 'Open lid' }).click();

  await expect(page.getByRole('tabpanel')).toHaveAccessibleName('Open lid');
});

test('shows the user guide in its own window and follows its links', async () => {
  const opened = app.waitForEvent('window');
  await page.getByRole('button', { name: 'Instructions' }).click();
  const instructions = await opened;
  await expect(instructions).toHaveTitle('Instructions');
  const guide = instructions.getByRole('article', { name: 'Instructions' });
  await expect(guide.getByRole('heading', { level: 1 })).toHaveText('Enigma user guide');

  await guide.getByRole('link', { name: 'Key sheets' }).click();

  await expect(guide.getByRole('heading', { level: 1 })).toHaveText('Key sheets');
  await page.getByRole('button', { name: 'Instructions' }).click();
  expect(app.windows()).toHaveLength(2);
  await instructions.close();
});

test('switches to Bombe mode and back', async () => {
  await page.getByRole('tab', { name: 'Plugboard' }).click();

  await page.getByRole('button', { name: 'Bombe' }).click();

  await expect(page.getByRole('tablist', { name: 'Bombe views' })).toBeVisible();
  await expect(page).toHaveTitle('Bombe');
  await page.keyboard.press('a');
  await page.getByRole('button', { name: 'Enigma' }).click();
  await expect(page.getByRole('tab', { name: 'Plugboard' })).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveTitle('Enigma');
  await page.getByRole('tab', { name: 'Top-down' }).click();
  await expect(page.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'A');
});

test('places a crib under an intercept in Bombe mode', async () => {
  await page.getByRole('button', { name: 'Bombe' }).click();
  await page.getByRole('tab', { name: 'Message' }).click();
  await page.getByRole('combobox', { name: 'Intercept' }).selectOption({ label: "Carter's weather crib" });
  await page.getByRole('button', { name: 'Load intercept' }).click();
  await expect(page.getByLabel('Cipher text', { exact: true })).toHaveText('SNMKG GSTZZ UGARL V');

  await page.getByRole('tab', { name: 'Crib' }).click();
  await page.getByRole('textbox', { name: 'Crib' }).fill('wetter');
  await page.getByRole('button', { name: 'Set crib' }).click();
  const slider = page.getByRole('slider', { name: 'Crib position' });
  await expect(slider).toHaveAttribute('aria-valuenow', '1');
  for (let step = 0; step < 4; step++) {
    await page.keyboard.press('ArrowRight');
  }
  await expect(slider).toHaveAttribute('aria-valuetext', 'Position 5, 1 crash');
  await expect(page.getByRole('button', { name: 'Place crib' })).toBeDisabled();

  await page.getByRole('button', { name: 'Slide left' }).click();
  await page.getByRole('button', { name: 'Place crib' }).click();

  await expect(page.getByLabel('Placed')).toHaveText('Placed at position 4');
  await page.getByRole('button', { name: 'Enigma' }).click();
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

test('generates a year of key sheets, applies a daily key and deletes a sheet', async () => {
  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });

  await panel.getByRole('button', { name: 'Generate' }).click();
  const form = panel.getByRole('form', { name: 'Generate key sheets' });
  await form.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await form.getByRole('spinbutton', { name: 'Year' }).fill('1944');
  await form.getByRole('button', { name: 'Generate' }).click();
  await expect(form).toHaveCount(0);
  const months = panel.getByRole('combobox', { name: 'Month' });
  for (let month = 1; month <= 12; month++) {
    await expect(months.locator(`option[value="1944-${String(month).padStart(2, '0')}"]`)).toHaveCount(1);
  }

  await months.selectOption('1944-02');
  await expect(panel.getByRole('combobox', { name: 'Key sheet' }).locator('optgroup[label="M4"] option')).toHaveCount(10);
  await panel.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Aegir (generated)' });
  const day = panel.getByRole('listitem', { name: 'Day 29' });
  await expect(day).toContainText(/UKW (B|C)-thin/);
  await day.getByRole('button', { name: 'Apply' }).click();
  await day.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText(/^M4 · UKW (B|C)-thin · (Beta|Gamma) /);
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: Aegir 1944-02, day 29 · Grundstellung [A-Z]{4}$/);
  await expect(day).toContainText('Applied');

  await panel.getByRole('button', { name: 'Delete' }).click();
  await panel.getByRole('group', { name: 'Confirm delete' }).getByRole('button', { name: 'Delete' }).click();
  await expect(panel.getByRole('combobox', { name: 'Key sheet' }).getByRole('option', { name: 'Aegir (generated)' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Machine')).toHaveText('M3 · UKW B · I II III');
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveCount(0);
});

test('exports a key sheet with its Kenngruppenbuch and Tauschtafeln', async () => {
  const generated = await page.evaluate(() => window.enigma.keySheets.generate('M3', 1943));
  if (!generated.ok) {
    throw new Error(generated.problem.title);
  }
  const sheet = await page.evaluate((id) => window.enigma.keySheets.get(id), generated.value.find((s) => s.network === 'Neptun' && s.month === '1943-03')!.id);
  if (!sheet.ok) {
    throw new Error(sheet.problem.title);
  }
  const file = path.join(userData, 'export.json');
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = () => Promise.resolve({ canceled: false, filePath });
  }, file);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });
  await panel.getByRole('combobox', { name: 'Month' }).selectOption('1943-03');
  await panel.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Neptun (generated)' });
  await panel.getByRole('button', { name: 'Export' }).click();

  const readExport = () => {
    try {
      return readFileSync(file, 'utf8');
    } catch {
      return null;
    }
  };
  const complete = () => {
    try {
      return JSON.parse(readExport() ?? '') !== null;
    } catch {
      return false;
    }
  };
  await expect.poll(complete).toBe(true);
  const content = readExport()!;
  const exported = JSON.parse(content) as KeySheetFile;
  expect(content).toBe(JSON.stringify(exported));
  expect(exported.network).toBe('Neptun');
  expect(exported.kenngruppenbuch?.id).toBe(sheet.value.kenngruppenbuchId);
  expect(exported.kenngruppenbuch?.columns).toHaveLength(676);
  expect(exported.tauschtafeln?.id).toBe(sheet.value.tauschtafelSetId);
  expect(exported.tauschtafeln?.tables).toHaveLength(9);

  await page.getByRole('button', { name: 'Key sheets' }).click();
});

test('prints a key sheet and its Kenngruppenbuch and Tauschtafeln to two PDFs', async () => {
  const generated = await page.evaluate(() => window.enigma.keySheets.generate('M4', 1942));
  if (!generated.ok) {
    throw new Error(generated.problem.title);
  }
  const folder = mkdtempSync(path.join(userData, 'print-'));
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = () => Promise.resolve({ canceled: false, filePaths: [filePath] });
  }, folder);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  const panel = page.getByRole('complementary', { name: 'Key sheets' });
  await panel.getByRole('combobox', { name: 'Month' }).selectOption('1942-06');
  await panel.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Hydra (generated)' });
  await expect(panel.getByRole('checkbox', { name: 'Also print the Kenngruppenbuch and Tauschtafeln' })).toBeChecked();
  await panel.getByRole('button', { name: 'Print to PDF' }).click();

  const read = (name: string) => {
    const file = path.join(folder, name);
    return existsSync(file) ? readFileSync(file, 'latin1') : '';
  };
  const done = (name: string) => read(name).trimEnd().endsWith('%%EOF');
  await expect.poll(() => done('Hydra-1942-06.pdf') && done('Kenngruppenbuch-Tauschtafeln-1942.pdf'), { timeout: 30_000 }).toBe(true);
  const pages = (pdf: string) => pdf.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
  const sheet = read('Hydra-1942-06.pdf');
  const book = read('Kenngruppenbuch-Tauschtafeln-1942.pdf');
  expect(sheet.startsWith('%PDF-')).toBe(true);
  expect(sheet).toContain('SpecialElite');
  expect(sheet).toContain('CourierPrime');
  expect(pages(sheet)).toBeLessThan(3);
  expect(pages(book)).toBeGreaterThan(40);

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

async function typeLetters(letters: string, into: Page = page): Promise<void> {
  for (const letter of letters.toLowerCase()) {
    await into.keyboard.press(letter);
  }
}

test('sends a message with the indicator procedure and receives it again', async () => {
  await page.getByRole('button', { name: 'Key sheets' }).click();
  const sheets = page.getByRole('complementary', { name: 'Key sheets' });
  await sheets.getByRole('button', { name: 'Generate' }).click();
  const form = sheets.getByRole('form', { name: 'Generate key sheets' });
  await form.getByRole('combobox', { name: 'Model' }).selectOption('M3');
  await form.getByRole('spinbutton', { name: 'Year' }).fill('1945');
  await form.getByRole('button', { name: 'Generate' }).click();
  await expect(form).toHaveCount(0);
  await sheets.getByRole('combobox', { name: 'Month' }).selectOption('1945-03');
  await sheets.getByRole('combobox', { name: 'Key sheet' }).selectOption({ label: 'Triton (generated)' });
  await sheets.getByRole('listitem', { name: 'Day 1', exact: true }).getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: Triton 1945-03, day 1 · Grundstellung [A-Z]{3}$/);

  await page.getByRole('button', { name: 'Key sheets' }).click();
  const opened = app.waitForEvent('window');
  await page.getByRole('button', { name: "Operator's notebook" }).click();
  const notebook = await opened;
  await expect(notebook).toHaveTitle("Operator's notebook");
  await page.getByRole('button', { name: "Operator's notebook" }).click();
  expect(app.windows()).toHaveLength(2);
  await page.getByRole('tab', { name: 'Top-down' }).click();

  const step = notebook.locator('[aria-current="step"]');
  const runMessageKey = async () => {
    await expect(step).toHaveAccessibleName('Set the Grundstellung');
    await setRotors((await notebook.getByRole('group', { name: 'Grundstellung' }).textContent())!);
    const verfahren = (await notebook.getByRole('group', { name: 'Lower row' }).textContent())!.slice(0, 3);
    await typeLetters(verfahren, notebook);
    await expect(step).toHaveAccessibleName('Set the Spruchschlüssel');
    await setRotors((await notebook.getByRole('group', { name: 'Spruchschlüssel' }).textContent())!);
    await expect(step).toHaveAccessibleName('Type the message');
  };

  await notebook.getByRole('button', { name: 'Send a message' }).click();
  await notebook.getByRole('button', { name: 'Random' }).click();
  await notebook.getByRole('button', { name: 'Encrypt indicator' }).click();
  await runMessageKey();
  await typeLetters('WETTERXX');
  await notebook.getByRole('button', { name: 'Finish' }).click();
  const message = (await notebook.getByRole('status', { name: 'Radio message' }).textContent())!;
  expect(message).toMatch(/^\d{4} = 24 = ([A-Z]{4} ){5}[A-Z]{4}$/);
  await notebook.getByRole('button', { name: 'Copy' }).click();
  await expect(notebook.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await app.evaluate(({ clipboard }) => clipboard.readText())).toBe(message);

  await notebook.getByRole('button', { name: 'New message' }).click();
  await page.getByRole('combobox', { name: 'Model' }).selectOption('M4');
  await page.getByRole('button', { name: 'Switch' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveCount(0);
  await notebook.getByRole('tab', { name: 'Decrypt' }).click();
  await notebook.getByRole('textbox', { name: 'Received message' }).fill(message);
  await notebook.getByLabel('Date').fill('1945-03-01');
  await notebook.getByRole('button', { name: 'Find key' }).click();
  await notebook.getByRole('list', { name: 'Matching keys' }).getByRole('button', { name: 'Receive with this key' }).click();
  await expect(page.getByLabel('Daily key', { exact: true })).toHaveText(/^Key: Triton 1945-03, day 1 · Grundstellung [A-Z]{3}$/);
  await runMessageKey();
  const cipher = message.split(' = ')[2].split(' ').slice(2, 4).join('');
  await typeLetters(cipher, notebook);

  await expect(notebook.getByRole('group', { name: 'Plaintext' })).toHaveText('WETT ERXX');
  await notebook.getByRole('button', { name: 'New message' }).click();
  await notebook.close();
  expect(app.windows()).toHaveLength(1);
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
