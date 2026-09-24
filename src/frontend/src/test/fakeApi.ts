import { vi } from 'vitest';
import type { BackendStatus, EnigmaApi, KeySheet, KeySheetSummary, MachineState } from '../api';

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

export const generatedSheet: KeySheet = {
  id: 'g1',
  network: 'Triton',
  month: '1944-06',
  model: 'M4',
  provenance: 'Generated',
  source: null,
  readOnly: false,
  days: [
    {
      day: 1,
      reflector: 'B-thin',
      rotors: ['Beta', 'II', 'IV', 'I'],
      rings: [1, 1, 1, 22],
      plugs: ['AT', 'BL', 'DF'],
      kenngruppen: ['ABC', 'DEF'],
    },
    { day: 2, reflector: 'B-thin', rotors: ['Beta', 'II', 'IV', 'I'], rings: [1, 1, 1, 22], plugs: ['CO'], kenngruppen: [] },
  ],
  text: '1 B-thin Beta II IV I 01 01 01 22 AT BL DF ABC DEF\n2 B-thin Beta II IV I 01 01 01 22 CO\n',
};

export const historicalSheet: KeySheet = {
  ...generatedSheet,
  id: 'historical-hydra',
  network: 'Hydra',
  model: 'M3',
  provenance: 'Historical',
  source: 'Test transcription',
  readOnly: true,
  days: [{ day: 26, reflector: 'B', rotors: ['III', 'VI', 'VIII'], rings: [1, 8, 13], plugs: ['AN', 'EZ'], kenngruppen: null }],
  text: '26 B III VI VIII 01 08 13 AN EZ\n',
};

export function summaryOf({ id, network, month, model, provenance, source, readOnly }: KeySheet): KeySheetSummary {
  return { id, network, month, model, provenance, source, readOnly };
}

export function createFakeApi(status: BackendStatus = { state: 'running' }) {
  const listeners = new Set<(status: BackendStatus) => void>();
  const ok = (value: MachineState = defaultM3) => vi.fn().mockResolvedValue({ ok: true, value });
  const sheet = (value: KeySheet = generatedSheet) => vi.fn().mockResolvedValue({ ok: true, value });

  const api = {
    health: vi.fn().mockResolvedValue({ ok: true, value: { status: 'ok', version: '1.2.3' } }),
    machine: {
      getState: ok(),
      create: ok(),
      insertRotor: ok(),
      removeRotor: ok(),
      turnRotor: ok(),
      setRingSetting: ok(),
      setReflector: ok(),
      connectPlug: ok(),
      disconnectPlug: ok(),
      movePlug: ok(),
      pressKey: ok(),
      releaseKey: ok(),
      applyDailyKey: ok(),
    },
    keySheets: {
      list: vi.fn().mockResolvedValue({ ok: true, value: [summaryOf(generatedSheet)] }),
      get: sheet(),
      create: sheet(),
      update: sheet(),
      remove: vi.fn().mockResolvedValue({ ok: true, value: null }),
      generate: sheet(),
      import: sheet(),
    },
    files: {
      openKeySheet: vi.fn().mockResolvedValue(null),
      saveKeySheet: vi.fn().mockResolvedValue(null),
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
