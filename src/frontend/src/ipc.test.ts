import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { EnigmaApi } from './api';
import { registerIpc, type Windows } from './ipc';
import { bombeRoutes, keySheetRoutes, machineRoutes, procedureRoutes, type Route } from './routes';

const electron = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown, ...args: unknown[]) => unknown>();
  const sender = { send: vi.fn() };
  const other = { send: vi.fn() };
  const exposed: Record<string, unknown> = {};
  return {
    handlers,
    sender,
    other,
    exposed,
    module: {
      ipcMain: { handle: (channel: string, handler: (event: unknown, ...args: unknown[]) => unknown) => handlers.set(channel, handler) },
      ipcRenderer: {
        invoke: (channel: string, ...args: unknown[]) => Promise.resolve(handlers.get(channel)?.({ sender }, ...args)),
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      contextBridge: { exposeInMainWorld: (name: string, value: unknown) => (exposed[name] = value) },
      BrowserWindow: { getAllWindows: () => [{ webContents: sender }, { webContents: other }] },
      clipboard: { writeText: vi.fn() },
    },
  };
});

vi.mock('electron', () => electron.module);
vi.mock('./files', () => ({ registerFiles: vi.fn() }));

const baseUrl = 'http://127.0.0.1:5000';
let hut8Open = false;
let api: EnigmaApi;

beforeAll(async () => {
  const windows: Windows = { openNotebook: vi.fn(), openHut8Notebook: vi.fn(), isHut8Open: () => hut8Open, openInstructions: vi.fn() };
  registerIpc({ status: vi.fn(), onStatus: vi.fn(), baseUrl: () => Promise.resolve(baseUrl), restart: vi.fn(), stop: vi.fn() }, windows);
  await import('./preload');
  api = electron.exposed.enigma as EnigmaApi;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function stubFetch() {
  const fetch = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(() => Promise.resolve(new Response('{}', { status: 200 })));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

const groups = { machine: machineRoutes, keySheets: keySheetRoutes, procedure: procedureRoutes, bombe: bombeRoutes };
const operations = Object.entries(groups).flatMap(([group, routes]) =>
  Object.entries(routes).map(([name, toRoute]) => [`${group}.${name}`, group, name, toRoute as (...args: unknown[]) => Route] as const),
);

describe('the preload bridge and the IPC handlers', () => {
  it.each(operations)('sends %s to its backend endpoint', async (_label, group, name, toRoute) => {
    const fetch = stubFetch();
    const args = Array.from({ length: toRoute.length }, (_, index) => `arg${index}`);
    const call = (api as unknown as Record<string, Record<string, (...args: unknown[]) => Promise<unknown>>>)[group][name];

    await call(...args);

    const route = toRoute(...args);
    expect(fetch).toHaveBeenCalledWith(`${baseUrl}${route.path}`, expect.objectContaining({ method: route.method }));
    const body = fetch.mock.calls[0][1].body as string | undefined;
    expect(body === undefined ? undefined : JSON.parse(body)).toEqual(route.body);
  });

  it('starts a run that logs its stops while the Hut 8 notebook is open', async () => {
    const fetch = stubFetch();
    hut8Open = true;

    await api.bombe.startRun(null);
    hut8Open = false;
    await api.bombe.startRun(14.6);

    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toEqual({ speed: null, notebook: true });
    expect(JSON.parse(fetch.mock.calls[1][1].body as string)).toEqual({ speed: 14.6, notebook: false });
  });

  it('tells the other windows about Bombe changes but not about reads', async () => {
    stubFetch();

    await api.bombe.setCrib('WETTER');
    await api.bombe.getStops(0, 100);

    expect(electron.other.send).toHaveBeenCalledTimes(1);
    expect(electron.other.send).toHaveBeenCalledWith('bombe:result', { name: 'setCrib', args: ['WETTER'], value: {} });
    expect(electron.sender.send).not.toHaveBeenCalled();
  });

  it('sends the machine state to the other windows', async () => {
    stubFetch();

    await api.machine.pressKey('A');

    expect(electron.other.send).toHaveBeenCalledWith('machine:state', {});
    expect(electron.sender.send).not.toHaveBeenCalled();
  });
});
