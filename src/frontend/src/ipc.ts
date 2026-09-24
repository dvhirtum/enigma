import { BrowserWindow, ipcMain } from 'electron';
import type { ApiResult } from './api';
import type { Backend } from './backend';
import { send } from './http';
import { createQueue } from './queue';
import { registerFiles } from './files';
import { healthRoute, keySheetRoutes, machineRoutes, procedureRoutes, type Route } from './routes';

/** Registers one IPC channel per API operation. Machine calls reach the backend one at a time, in order. */
export function registerIpc(backend: Backend): void {
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
    ipcMain.handle(`machine:${name}`, (_event, ...args: unknown[]) => enqueue(() => call(route(...args))));
  }

  for (const [prefix, routes] of [
    ['keySheets', keySheetRoutes],
    ['procedure', procedureRoutes],
  ] as const) {
    for (const [name, toRoute] of Object.entries(routes)) {
      const route = toRoute as (...args: unknown[]) => Route;
      ipcMain.handle(`${prefix}:${name}`, (_event, ...args: unknown[]) => call(route(...args)));
    }
  }

  registerFiles();

  ipcMain.handle('backend:status', () => backend.status());
  ipcMain.handle('backend:restart', () => backend.restart());

  backend.onStatus((status) => {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send('backend:status', status);
    }
  });
}
