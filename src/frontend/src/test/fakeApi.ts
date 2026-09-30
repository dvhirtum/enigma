import { vi } from 'vitest';
import type { BackendStatus, BombeCheck, BombeRun, BombeState, BombeStop, EnigmaApi, Intercept, Kenngruppenbuch, KeySheet, KeySheetSummary, MachineState, OperatorState, TauschtafelSet } from '../api';

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
  typed: '',
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
};

/** The export of the generated sheet as the backend returns it, with its id and provenance cleared. */
export const exportedFile = {
  id: null,
  network: generatedSheet.network,
  month: generatedSheet.month,
  provenance: null,
  source: null,
  days: generatedSheet.days,
  kenngruppenbuchId: 'book',
  tauschtafelSetId: 'tables',
  kenngruppenbuch: fakeBook,
  tauschtafeln: fakeTables,
};

export const emptyBombe: BombeState = {
  source: null,
  cipherText: '',
  crib: null,
  placements: [],
  position: null,
  menu: null,
  machine: null,
  settings: { input: 'A', diagonalBoard: true, reflector: 'B' },
  run: null,
  stops: 0,
};

export const carterBombe: BombeState = {
  ...emptyBombe,
  source: {
    kind: 'Intercept',
    title: 'Carter weather crib',
    hint: 'A weather forecast.',
    transcript: 'SNMKG GSTZZ UGARL V',
    message: null,
    hasCrib: true,
    hasSolution: true,
  },
  cipherText: 'SNMKGGSTZZUGARLV',
};

/** The job with `crib` under the cipher text, crashes worked out as the backend does, placed at `position` if given. */
export function withCrib(state: BombeState, crib: string, position: number | null = null): BombeState {
  const placements = Array.from({ length: Math.max(0, state.cipherText.length - crib.length + 1) }, (_, start) => ({
    position: start,
    crashes: [...crib].flatMap((letter, index) => (state.cipherText[start + index] === letter ? [index] : [])),
  }));
  return { ...state, crib, placements, position };
}

/** Carter's crib placed at the start, with his training menu (positions 3, 4 and 8 left out) and the test register on G. */
export const carterMenu: BombeState = {
  ...withCrib(carterBombe, 'WETTERVORHERSAGE', 0),
  menu: {
    links: ['SW1', 'NE2', 'GE5', 'GR6', 'SV7', 'ZR9', 'ZH10', 'UE11', 'GR12', 'AS13', 'RA14', 'LG15', 'VE16'],
    cribLinks: ['SW1', 'NE2', 'MT3', 'KT4', 'GE5', 'GR6', 'SV7', 'TO8', 'ZR9', 'ZH10', 'UE11', 'GR12', 'AS13', 'RA14', 'LG15', 'VE16'],
    testRegister: 'G',
    connectedLinks: ['SW1', 'NE2', 'GE5', 'GR6', 'SV7', 'ZR9', 'ZH10', 'UE11', 'GR12', 'AS13', 'RA14', 'LG15', 'VE16'],
    loops: 2,
    stopsWithBoard: 0.4,
    stopsWithoutBoard: 721.3,
  },
  // 13 links take two chains: one copy, with drums II V III fitted.
  machine: {
    chainsPerCopy: 2,
    copies: [{ drums: ['II', 'V', 'III'], starts: ['ZZA', 'ZZB', 'ZZE', 'ZZF', 'ZZG', 'ZZI', 'ZZJ', 'ZZK', 'ZZL', 'ZZM', 'ZZN', 'ZZO', 'ZZP'] }],
  },
};

/** A paced run of Carter's menu on II V III, paused at the true stop. */
export const carterPaused: BombeRun = {
  status: 'Paused',
  speed: 14.6,
  reflector: 'B',
  wheelOrders: ['II V III'],
  positionsTested: 1713,
  positions: 17576,
  position: 'WPD',
  pause: { index: 0, wheelOrder: 'II V III', position: 'VMB', indicator: 'DKX', testRegister: 'G', liveWires: 'Q', stecker: 'Q', verdict: 'Unchecked' },
  stops: 1,
  allStops: 1,
  error: null,
  elapsedSeconds: 117.3,
};

/** The two stops of Carter's menu on II V III: the true one at VMB and a false one. */
export const carterStops: BombeStop[] = [
  { index: 0, wheelOrder: 'II V III', position: 'VMB', indicator: 'DKX', testRegister: 'G', liveWires: 'Q', stecker: 'Q', verdict: 'Unchecked' },
  { index: 1, wheelOrder: 'II V III', position: 'KQF', indicator: 'NFO', testRegister: 'G', liveWires: 'ABCDEFHIJKLMNOPQRSTUVWXYZ', stecker: 'G', verdict: 'Unchecked' },
];

const carterCrib = 'WETTERVORHERSAGE';

/** The check of Carter's true stop as it starts: the rings at the indicator, the windows at ZZZ, only G/Q known. */
export const carterCheck: BombeCheck = {
  stop: carterStops[0],
  machineWindows: 'ZZZ',
  machineRings: 'DKX',
  steckers: 'GQ',
  rightRing: 26,
  verdict: 'Unchecked',
  crib: [...carterCrib].map((plain, index) => ({ offset: index + 1, plain, cipher: 'SNMKGGSTZZUGARLV'[index], match: 'Unknown' })),
  decrypt: '?'.repeat(16),
  key: { reflector: 'B', wheelOrder: 'II V III', rings: [26, 26, 26], plugs: ['GQ'], messageKey: 'ULA' },
};

/** Carter's check with every stecker found: the crib matches and decrypts. */
export const carterChecked: BombeCheck = {
  ...carterCheck,
  steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW',
  crib: carterCheck.crib.map((letter) => ({ ...letter, match: 'Match' })),
  decrypt: carterCrib,
  key: { ...carterCheck.key, plugs: ['AD', 'ET', 'FU', 'GQ', 'HM', 'IK', 'JL', 'NV', 'OX', 'PZ'] },
};

export const intercepts: Intercept[] = [
  { id: 'carter', title: 'Carter weather crib', date: null, hint: 'A weather forecast.' },
  { id: 'scharnhorst', title: 'Scharnhorst', date: '1943-12-26', hint: null },
];

export function summaryOf({ id, network, month, model, provenance, source, readOnly }: KeySheet): KeySheetSummary {
  return { id, network, month, model, provenance, source, readOnly };
}

export function createFakeApi(status: BackendStatus = { state: 'running' }) {
  const listeners = new Set<(status: BackendStatus) => void>();
  const stateListeners = new Set<(state: MachineState) => void>();
  const keySheetListeners = new Set<() => void>();
  const ok = (value: MachineState = defaultM3) => vi.fn().mockResolvedValue({ ok: true, value });
  const bombe = (value: BombeState = emptyBombe) => vi.fn().mockResolvedValue({ ok: true, value });
  const run = (value: BombeRun = { ...carterPaused, status: 'Running', pause: null }) => vi.fn().mockResolvedValue({ ok: true, value });
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
      setUpMachine: ok(),
      startSending: ok(),
      startReceiving: ok(),
      chooseGroups: ok(),
      finishMessage: ok(),
      cancelOperator: ok(),
    },
    keySheets: {
      list: vi.fn().mockResolvedValue({ ok: true, value: [summaryOf(generatedSheet)] }),
      get: sheet(),
      remove: vi.fn().mockResolvedValue({ ok: true, value: null }),
      generate: vi.fn().mockResolvedValue({ ok: true, value: [summaryOf(generatedSheet)] }),
      import: sheet(),
      export: vi.fn().mockResolvedValue({ ok: true, value: exportedFile }),
    },
    procedure: {
      getBook: vi.fn().mockResolvedValue({ ok: true, value: fakeBook }),
      findReceivingKeys: vi.fn().mockResolvedValue({ ok: true, value: [] }),
    },
    bombe: {
      getState: bombe(),
      intercepts: vi.fn().mockResolvedValue({ ok: true, value: intercepts }),
      loadIntercept: bombe(carterBombe),
      generateExercise: bombe(),
      pasteCipherText: bombe(),
      setCrib: bombe(),
      placeCrib: bombe(),
      setMenu: bombe(),
      buildMenu: bombe(),
      configure: bombe(),
      fitDrums: bombe(),
      turnScrambler: bombe(),
      clearStops: bombe(),
      startRun: run(),
      setRunSpeed: run(),
      continueRun: run(),
      cancelRun: run({ ...carterPaused, status: 'Cancelled', pause: null, position: null }),
      getRun: run(),
      getStops: vi.fn().mockResolvedValue({ ok: true, value: carterStops }),
      getCheck: vi.fn().mockResolvedValue({ ok: true, value: carterCheck }),
      setCheck: vi.fn().mockResolvedValue({ ok: true, value: carterChecked }),
      pressCheckKey: vi.fn().mockResolvedValue({ ok: true, value: { lamp: 'R' } }),
      confirmCheck: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          verdict: 'True',
          cribMismatches: [],
          cribUnknown: [],
          solution: { isTrueStop: true, verdictCorrect: true, wrongPairs: [], missingPairs: [], rightRingCorrect: true },
          check: { ...carterChecked, verdict: 'True', stop: { ...carterChecked.stop, verdict: 'True' } },
        },
      }),
      suggestSteckers: vi.fn().mockResolvedValue({
        ok: true,
        value: { pairs: [{ pair: 'IK', gain: 12.5 }, { pair: 'OX', gain: 9.1 }], steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW', decrypt: carterCrib },
      }),
      findRightRing: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          rings: Array.from({ length: 26 }, (_, index) => ({ ring: index + 1, score: index < 20 ? 30 : 12 - index / 4, best: index < 20 })),
          check: { ...carterChecked, rightRing: 1 },
        },
      }),
    },
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    files: {
      openKeySheet: vi.fn().mockResolvedValue(null),
      saveKeySheet: vi.fn().mockResolvedValue(null),
      printKeySheet: vi.fn().mockResolvedValue(null),
      printToFolder: vi.fn().mockResolvedValue(null),
    },
    windows: {
      openNotebook: vi.fn().mockResolvedValue(undefined),
      openInstructions: vi.fn().mockResolvedValue(undefined),
      onMachineState: vi.fn((listener: (state: MachineState) => void) => {
        stateListeners.add(listener);
        return () => stateListeners.delete(listener);
      }),
      onKeySheetsChanged: vi.fn((listener: () => void) => {
        keySheetListeners.add(listener);
        return () => keySheetListeners.delete(listener);
      }),
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
  const pushState = (next: MachineState) => stateListeners.forEach((listener) => listener(next));
  const pushKeySheetsChanged = () => keySheetListeners.forEach((listener) => listener());

  return { api, pushStatus, pushState, pushKeySheetsChanged };
}
