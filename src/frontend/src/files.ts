import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { PrintDocument } from './api';

const filters = [{ name: 'Key sheets', extensions: ['json'] }];
const pdfFilters = [{ name: 'PDF', extensions: ['pdf'] }];
const MAX_BYTES = 1_000_000;
const MAX_PRINT_BYTES = 20_000_000;

const MAX_PRINT_DOCUMENTS = 2;

const windowOf = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender) ?? undefined;
const safeName = (name: string) => name.replace(/[^\w.-]+/g, '-');

function isPrintDocument(value: unknown): value is PrintDocument {
  const document = value as PrintDocument;
  return typeof value === 'object' && value !== null && typeof document.html === 'string' && typeof document.name === 'string' && /^[\w-]+\.pdf$/.test(safeName(document.name));
}

function isPrintDocuments(value: unknown): value is PrintDocument[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= MAX_PRINT_DOCUMENTS &&
    value.every(isPrintDocument) &&
    value.reduce((total: number, document: PrintDocument) => total + document.html.length, 0) <= MAX_PRINT_BYTES
  );
}

/** Prints an HTML document to PDF in a hidden window without scripts. */
async function printToPdf(html: string): Promise<Buffer> {
  const folder = await mkdtemp(path.join(os.tmpdir(), 'enigma-print-'));
  const window = new BrowserWindow({ show: false, webPreferences: { javascript: false, sandbox: true, contextIsolation: true, nodeIntegration: false } });
  try {
    const file = path.join(folder, 'sheet.html');
    await writeFile(file, html, 'utf8');
    await window.loadFile(file);
    return await window.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
  } finally {
    window.destroy();
    await rm(folder, { recursive: true, force: true });
  }
}

/** Registers the file dialogs for importing, exporting and printing key sheets. Only files the user picks are read or written. */
export function registerFiles(): void {
  ipcMain.handle('files:openKeySheet', async (event) => {
    const window = windowOf(event);
    const options = { title: 'Import key sheet', filters, properties: ['openFile' as const] };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    const [file] = result.filePaths;
    if (result.canceled || !file) {
      return null;
    }
    if ((await stat(file)).size > MAX_BYTES) {
      throw new Error('The file is too large for a key sheet.');
    }
    return readFile(file, 'utf8');
  });

  ipcMain.handle('files:saveKeySheet', async (event, name: unknown, content: unknown) => {
    if (typeof name !== 'string' || typeof content !== 'string') {
      throw new Error('Invalid key sheet export.');
    }
    const window = windowOf(event);
    const options = { title: 'Export key sheet', defaultPath: safeName(name), filters };
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    await writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });

  ipcMain.handle('files:printKeySheet', async (event, name: unknown, html: unknown) => {
    if (typeof name !== 'string' || typeof html !== 'string' || html.length > MAX_PRINT_BYTES) {
      throw new Error('Invalid key sheet print.');
    }
    const window = windowOf(event);
    const options = { title: 'Print key sheet to PDF', defaultPath: safeName(name), filters: pdfFilters };
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    await writeFile(result.filePath, await printToPdf(html));
    return result.filePath;
  });

  ipcMain.handle('files:printToFolder', async (event, documents: unknown) => {
    if (!isPrintDocuments(documents)) {
      throw new Error('Invalid key sheet print.');
    }
    const window = windowOf(event);
    const options = { title: 'Print key sheet to PDF files in folder', properties: ['openDirectory' as const, 'createDirectory' as const] };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    const [folder] = result.filePaths;
    if (result.canceled || !folder) {
      return null;
    }
    for (const { name, html } of documents) {
      await writeFile(path.join(folder, safeName(name)), await printToPdf(html));
    }
    return folder;
  });
}
