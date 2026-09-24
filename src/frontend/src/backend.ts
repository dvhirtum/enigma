import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { app } from 'electron';
import type { BackendStatus } from './api';

const PORT_LINE = /^ENIGMA_API_PORT=(\d+)$/;
const START_TIMEOUT_MS = 60_000;

export interface Backend {
  status(): BackendStatus;
  onStatus(listener: (status: BackendStatus) => void): void;
  baseUrl(): Promise<string>;
  restart(): void;
  stop(): void;
}

function spawnApi(): ChildProcess {
  const options: SpawnOptions = { stdio: ['ignore', 'pipe', 'inherit'], windowsHide: true };
  const keySheets = (historicalPath: string) => [
    `--KeySheets:HistoricalPath=${historicalPath}`,
    `--KeySheets:UserPath=${path.join(app.getPath('userData'), 'keysheets')}`,
  ];

  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? 'Enigma.Api.exe' : 'Enigma.Api';
    return spawn(path.join(process.resourcesPath, 'backend', exe), keySheets(path.join(process.resourcesPath, 'keysheets')), options);
  }

  const project = path.resolve(app.getAppPath(), '../backend/Enigma.Api');
  const historical = path.resolve(app.getAppPath(), '../../data/keysheets');
  return spawn('dotnet', ['run', '--project', project, '--no-launch-profile', '--', ...keySheets(historical)], options);
}

function kill(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { windowsHide: true });
  } else {
    child.kill();
  }
}

function rejected(message: string): Promise<string> {
  const promise = Promise.reject(new Error(message));
  promise.catch(() => undefined);
  return promise;
}

/** Runs the API as a child process and reports its status. */
export function createBackend(): Backend {
  const listeners: ((status: BackendStatus) => void)[] = [];
  let status: BackendStatus = { state: 'starting' };
  let child: ChildProcess | undefined;
  let url = rejected('The backend has not been started.');

  const setStatus = (next: BackendStatus) => {
    status = next;
    listeners.forEach((listener) => listener(next));
  };

  const release = () => {
    const current = child;
    child = undefined;
    if (current) {
      kill(current);
    }
  };

  const start = () => {
    const current = spawnApi();
    child = current;
    setStatus({ state: 'starting' });

    const fail = (message: string) => {
      if (child !== current) {
        return;
      }
      release();
      url = rejected(message);
      setStatus({ state: 'failed', message });
    };

    url = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('The backend did not report its port in time.')), START_TIMEOUT_MS);

      current.once('error', (error) => {
        clearTimeout(timer);
        reject(error);
      });

      current.once('exit', (code) => {
        clearTimeout(timer);
        const message = `The backend exited with code ${code}.`;
        reject(new Error(message));
        fail(message);
      });

      readline.createInterface({ input: current.stdout! }).on('line', (line) => {
        const match = PORT_LINE.exec(line.trim());
        if (match) {
          clearTimeout(timer);
          resolve(`http://127.0.0.1:${match[1]}`);
        }
      });
    });

    url.then(
      () => {
        if (child === current) {
          setStatus({ state: 'running' });
        }
      },
      (error: unknown) => fail(error instanceof Error ? error.message : String(error)),
    );
  };

  start();

  return {
    status: () => status,
    onStatus: (listener) => listeners.push(listener),
    baseUrl: () => url,
    restart: () => {
      release();
      start();
    },
    stop: release,
  };
}
