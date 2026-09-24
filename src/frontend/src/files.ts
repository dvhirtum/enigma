import { readFile, stat, writeFile } from 'node:fs/promises';
import { BrowserWindow, dialog, ipcMain, type IpcMainInvokeEvent } from 'electron';

const filters = [{ name: 'Key sheets', extensions: ['json'] }];
const MAX_BYTES = 1_000_000;

const windowOf = (event: IpcMainInvokeEvent) => BrowserWindow.fromWebContents(event.sender) ?? undefined;

/** Registers the file dialogs for importing and exporting key sheets. Only files the user picks are read or written. */
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
    const options = { title: 'Export key sheet', defaultPath: name.replace(/[^\w.-]+/g, '-'), filters };
    const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) {
      return null;
    }
    await writeFile(result.filePath, content, 'utf8');
    return result.filePath;
  });
}
