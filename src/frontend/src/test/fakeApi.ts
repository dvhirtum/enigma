import { vi } from 'vitest';
import type { BackendStatus, EnigmaApi, Kenngruppenbuch, KeySheet, KeySheetSummary, MachineState, OperatorState, TauschtafelSet } from '../api';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const trigram = (index: number) => alphabet[Math.floor(index / 676)] + alphabet[Math.floor(index / 26) % 26] + alphabet[index % 26];

/** Trigrams in alphabetical order: column 1 holds AAA–AAZ, column 101 holds DWA–DWZ. */
export const fakeBook: Kenngruppenbuch = {
  id: 'book',
  created: '1944-06-01T00:00:00+00:00',
  verfahrenkenngruppen: { first: 1, last: 100 },
  allotments: [
    { network: 'Triton', first: 101, last: 120 },
    { network: 'Hydra', first: 121, last: 140 },
  ],
  columns: Array.from({ length: 676 }, (_, column) => Array.from({ length: 26 }, (_, row) => trigram(column * 26 + row)).join(' ')),
};

export const fakeTables: TauschtafelSet = {
  id: 'tables',
  year: 1944,
  tables: Array.from({ length: 9 }, (_, index) => ({ number: index + 1, swaps: ['AAZZ', 'ABZY', `AC${alphabet[index]}Q`] })),
  calendar: Array.from({ length: 24 }, (_, index) => (index % 9) + 1),
};

export const sending: OperatorState = {
  direction: 'Send',
  step: 'ChooseGroups',
  network: 'Triton',
  kenngruppenbuchId: 'book',
  table: 3,
  grundstellung: 'QRSA',
  schluesselkenngruppe: null,
  verfahrenkenngruppe: null,
  fillers: 'QX',
  bigrams: [],
  indicator: null,
  spruchschluesselLamps: '',
  spruchschluessel: null,
  pad: '',
  expectedKey: null,
  fillersNeeded: 0,
  cipherText: null,
  message: null,
  warnings: [],
};

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
  appliedKey: null,
  operator: null,
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
      grundstellung: 'QRSA',
    },
    { day: 2, reflector: 'B-thin', rotors: ['Beta', 'II', 'IV', 'I'], rings: [1, 1, 1, 22], plugs: ['CO'], grundstellung: null },
  ],
  text: '1 B-thin Beta II IV I 01 01 01 22 AT BL DF QRSA\n2 B-thin Beta II IV I 01 01 01 22 CO\n',
  kenngruppenbuchId: 'book',
  tauschtafelSetId: 'tables',
};

export const historicalSheet: KeySheet = {
  ...generatedSheet,
  id: 'historical-hydra',
  network: 'Hydra',
  model: 'M3',
  provenance: 'Historical',
  source: 'Test transcription',
  readOnly: true,
  days: [{ day: 26, reflector: 'B', rotors: ['III', 'VI', 'VIII'], rings: [1, 8, 13], plugs: ['AN', 'EZ'], grundstellung: null }],
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
      startSending: ok(),
      startReceiving: ok(),
      chooseGroups: ok(),
      finishMessage: ok(),
      cancelOperator: ok(),
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
    procedure: {
      getBook: vi.fn().mockResolvedValue({ ok: true, value: fakeBook }),
      getTables: vi.fn().mockResolvedValue({ ok: true, value: fakeTables }),
      findReceivingKeys: vi.fn().mockResolvedValue({ ok: true, value: [] }),
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
