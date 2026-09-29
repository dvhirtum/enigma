import { BrowserWindow, clipboard, ipcMain } from 'electron';
import type { ApiResult, MachineState } from './api';
import type { Backend } from './backend';
import { send } from './http';
import { createQueue } from './queue';
import { registerFiles } from './files';
import { bombeRoutes, healthRoute, keySheetRoutes, machineRoutes, procedureRoutes, type Route } from './routes';

export interface Windows {
  openNotebook: () => void;
  openInstructions: () => void;
}

/**
 * Registers one IPC channel per API operation. Machine calls reach the backend one at a time, in order,
 * and the other windows receive the resulting machine state. The other windows are also told when key sheets change.
 */
export function registerIpc(backend: Backend, windows: Windows): void {
  const broadcast = (sender: Electron.WebContents, channel: string, ...args: unknown[]) => {
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.webContents !== sender) {
        window.webContents.send(channel, ...args);
      }
    }
  };

  const call = async <T>(route: Route): Promise<ApiResult<T>> => {
    let baseUrl: string;
    try {
      baseUrl = await backend.baseUrl();
    } catch (error) {
      return { ok: false, problem: { status: 0, title: 'The backend is not running.', detail: String(error) } };
    }
    return send<T>(baseUrl, route);
  };

  ipcMain.handle('api:health', () => call(healthRoute));

  const enqueue = createQueue();
  for (const [name, toRoute] of Object.entries(machineRoutes)) {
    const route = toRoute as (...args: unknown[]) => Route;
    ipcMain.handle(`machine:${name}`, (event, ...args: unknown[]) =>
      enqueue(async () => {
        const result = await call<MachineState>(route(...args));
        if (result.ok) {
          broadcast(event.sender, 'machine:state', result.value);
        }
        return result;
      }),
    );
  }

  const changesKeySheets = new Set(['generate', 'import', 'remove']);
  for (const [name, toRoute] of Object.entries(keySheetRoutes)) {
    const route = toRoute as (...args: unknown[]) => Route;
    ipcMain.handle(`keySheets:${name}`, async (event, ...args: unknown[]) => {
      const result = await call(route(...args));
      if (result.ok && changesKeySheets.has(name)) {
        broadcast(event.sender, 'keySheets:changed');
      }
      return result;
    });
  }

  for (const [name, toRoute] of Object.entries(procedureRoutes)) {
    const route = toRoute as (...args: unknown[]) => Route;
    ipcMain.handle(`procedure:${name}`, (_event, ...args: unknown[]) => call(route(...args)));
  }

  for (const [name, toRoute] of Object.entries(bombeRoutes)) {
    const route = toRoute as (...args: unknown[]) => Route;
    ipcMain.handle(`bombe:${name}`, (_event, ...args: unknown[]) => call(route(...args)));
  }

  registerFiles();

  ipcMain.handle('clipboard:writeText', (_event, text: unknown) => {
    if (typeof text !== 'string') {
      throw new Error('Only text can be copied.');
    }
    return clipboard.writeText(text);
  });

  ipcMain.handle('windows:openNotebook', () => windows.openNotebook());
  ipcMain.handle('windows:openInstructions', () => windows.openInstructions());

  ipcMain.handle('backend:status', () => backend.status());
  ipcMain.handle('backend:restart', () => backend.restart());

  backend.onStatus((status) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('backend:status', status);
    }
  });
}
