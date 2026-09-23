import { vi } from 'vitest';
import type { BackendStatus, EnigmaApi, MachineState } from '../api';

export const defaultM3: MachineState = {
  model: 'M3',
  reflector: 'B',
  rotors: [
    { rotor: 'I', ringSetting: 1, position: 'A', slot: 'Left' },
    { rotor: 'II', ringSetting: 1, position: 'A', slot: 'Middle' },
    { rotor: 'III', ringSetting: 1, position: 'A', slot: 'Right' },
  ],
  rotorBox: [],
  plugs: [],
  heldKey: null,
  litLamp: null,
};

export function createFakeApi(status: BackendStatus = { state: 'running' }) {
  const listeners = new Set<(status: BackendStatus) => void>();
  const ok = (value: MachineState = defaultM3) => vi.fn().mockResolvedValue({ ok: true, value });

  const api = {
    health: vi.fn().mockResolvedValue({ ok: true, value: { status: 'ok', version: '1.2.3' } }),
    machine: {
      getState: ok(),
      create: ok(),
      insertRotors: ok(),
      removeRotors: ok(),
      turnRotor: ok(),
      setRingSetting: ok(),
      setReflector: ok(),
      connectPlug: ok(),
      disconnectPlug: ok(),
      pressKey: ok(),
      releaseKey: ok(),
    },
    backend: {
      status: vi.fn().mockResolvedValue(status),
      onStatus: vi.fn((listener: (status: BackendStatus) => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      restart: vi.fn().mockResolvedValue(undefined),
    },
  } satisfies EnigmaApi;

  const pushStatus = (next: BackendStatus) => listeners.forEach((listener) => listener(next));

  return { api, pushStatus };
}
