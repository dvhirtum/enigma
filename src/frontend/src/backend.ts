import { spawn, spawnSync, type ChildProcess, type SpawnOptions } from 'node:child_process';
import path from 'node:path';
import readline from 'node:readline';
import { app } from 'electron';

const PORT_LINE = /^ENIGMA_API_PORT=(\d+)$/;
const START_TIMEOUT_MS = 60_000;

export interface Backend {
  baseUrl: string;
  stop(): void;
}

function spawnApi(): ChildProcess {
  const options: SpawnOptions = { stdio: ['ignore', 'pipe', 'inherit'] };

  if (app.isPackaged) {
    const exe = process.platform === 'win32' ? 'Enigma.Api.exe' : 'Enigma.Api';
    return spawn(path.join(process.resourcesPath, 'backend', exe), [], options);
  }

  const project = path.resolve(app.getAppPath(), '../backend/Enigma.Api');
  return spawn('dotnet', ['run', '--project', project, '--no-launch-profile'], options);
}

function kill(child: ChildProcess): void {
  if (child.pid === undefined || child.exitCode !== null) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F']);
  } else {
    child.kill();
  }
}

export function startBackend(): Promise<Backend> {
  const child = spawnApi();

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      kill(child);
      reject(new Error('Backend did not report its port in time.'));
    }, START_TIMEOUT_MS);

    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Backend exited with code ${code}.`));
    });

    readline.createInterface({ input: child.stdout! }).on('line', (line) => {
      const match = PORT_LINE.exec(line.trim());
      if (match) {
        clearTimeout(timer);
        resolve({ baseUrl: `http://127.0.0.1:${match[1]}`, stop: () => kill(child) });
      }
    });
  });
}
