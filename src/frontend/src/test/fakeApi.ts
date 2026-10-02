import { vi } from 'vitest';
import type {
  BackendStatus,
  BombeCheck,
  DayTraffic,
  RingTable,
  BombeMachine,
  BombeResult,
  BombeRun,
  BombeState,
  BombeStop,
  CheckingMachine,
  EnigmaApi,
  PrintedStop,
  Intercept,
  Kenngruppenbuch,
  KeySheet,
  KeySheetSummary,
  MachineState,
  MessageType,
  OperatorState,
  TauschtafelSet,
} from '../api';

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
  lamps: '',
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

/** A Bombe with nothing plugged in and no drums. */
export function emptyMachine(): BombeMachine {
  return {
    chains: Array.from({ length: 3 }, () => ({
      testRegister: null,
      input: 'A',
      scramblers: Array.from({ length: 12 }, () => ({ jacks: [null, null], drums: [null, null, null], start: 'ZZZ' })),
    })),
    joins: [false, false],
    pluggedForMenu: false,
    pluggedByHand: false,
    warnings: [],
  };
}

export const emptyChecker: CheckingMachine = { reflector: 'B', dummy: true, drums: [null, null, null], rings: 'ZZZ', windows: 'ZZZ', stop: null };

export const emptyBombe: BombeState = {
  source: null,
  cipherText: '',
  crib: null,
  placements: [],
  position: null,
  menu: null,
  machine: emptyMachine(),
  checker: emptyChecker,
  settings: { diagonalBoard: true, reflector: 'B' },
  run: null,
  stops: 0,
  printed: 0,
  day: null,
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
    hasWheelOrders: true,
    wheelOrders: null,
    hasCribPositions: false,
    cribPositions: null,
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

/** The Bombe plugged up with Carter's menu: 13 links on chain 1 and the first scrambler of chain 2, joined, drums II V III, test register on G. */
export function carterMachine(): BombeMachine {
  const machine = emptyMachine();
  const links = ['SW1', 'NE2', 'GE5', 'GR6', 'SV7', 'ZR9', 'ZH10', 'UE11', 'GR12', 'AS13', 'RA14', 'LG15', 'VE16'];
  links.forEach((link, index) => {
    const offset = Number(link.slice(2));
    machine.chains[Math.floor(index / 12)].scramblers[index % 12] = {
      jacks: [link[0], link[1]],
      drums: ['II', 'V', 'III'],
      start: `ZZ${String.fromCharCode(64 + offset)}`,
    };
  });
  machine.chains[0].testRegister = 'G';
  machine.joins = [true, false];
  machine.pluggedForMenu = true;
  return machine;
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
  },
  machine: carterMachine(),
};

/** Carter's true stop as the Bombe prints it. */ export const carterPrinted: PrintedStop = {
  index: 0,
  chains: [0, 1],
  wheelOrder: 'II V III',
  drumLetters: 'WPC',
  indicator: 'DKX',
  testRegister: 'G',
  liveWires: 'ABCDEFGHIJKLMNOPRSTUVWXYZ',
  stecker: 'Q',
};
/** A paced run of Carter's menu on II V III, paused at the true stop. */
export const carterPaused: BombeRun = {
  status: 'Paused',
  speed: 14.6,
  reflector: 'B',
  groups: [{ chains: [0, 1], wheelOrder: 'II V III', testRegister: 'G', input: 'A' }],
  logged: true,
  positionsTested: 1713,
  positions: 17576,
  position: 'WPD',
  pause: carterPrinted,
  stops: 1,
  allStops: 1,
  printed: 1,
  error: null,
  elapsedSeconds: 117.3,
};

/** The two stops of Carter's menu on II V III: the true one at VMB and a false one. */
export const carterStops: BombeStop[] = [
  { index: 0, wheelOrder: 'II V III', position: 'VMB', indicator: 'DKX', testRegister: 'G', liveWires: 'Q', stecker: 'Q', verdict: 'Unchecked' },
  {
    index: 1,
    wheelOrder: 'II V III',
    position: 'KQF',
    indicator: 'NFO',
    testRegister: 'G',
    liveWires: 'ABCDEFHIJKLMNOPQRSTUVWXYZ',
    stecker: 'G',
    verdict: 'Unchecked',
  },
];

/** The checking machine as the notebook sets it up for Carter's true stop. */
export const carterChecker: CheckingMachine = { reflector: 'B', dummy: true, drums: ['II', 'V', 'III'], rings: 'DKX', windows: 'ZZZ', stop: carterStops[0] };
const carterCrib = 'WETTERVORHERSAGE';

/** The check of Carter's true stop as it starts: the rings at the indicator, the windows at ZZZ, only G/Q known. */
export const carterCheck: BombeCheck = {
  stop: carterStops[0],
  steckers: 'GQ',
  contradicted: '',
  checkedSteckers: '',
  middleRing: 26,
  rightRing: 26,
  verdict: 'Unchecked',
  crib: [...carterCrib].map((plain, index) => ({ offset: index + 1, plain, cipher: 'SNMKGGSTZZUGARLV'[index], match: 'Unknown' })),
  decrypt: 'XGTMBRVOAHEJSAGF',
  key: { reflector: 'B', wheelOrder: 'II V III', rings: [26, 26, 26], plugs: ['GQ'], messageKey: 'ULA' },
  reading: null,
};

/** Carter's check with every stecker found: the crib matches and decrypts. */
export const carterChecked: BombeCheck = {
  ...carterCheck,
  steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW',
  crib: carterCheck.crib.map((letter) => ({ ...letter, match: 'Match' })),
  decrypt: carterCrib,
  key: { ...carterCheck.key, plugs: ['AD', 'ET', 'FU', 'GQ', 'HM', 'IK', 'JL', 'NV', 'OX', 'PZ'] },
};

export const messageTypes: MessageType[] = [
  { id: 'weather', name: 'Weather forecast' },
  { id: 'nothing-to-report', name: 'Nothing to report' },
  { id: 'own-position', name: 'U-boat position report' },
  { id: 'convoy', name: 'Convoy report' },
];

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
  const modeListeners = new Set<(mode: 'enigma' | 'bombe') => void>();
  const bombeListeners = new Set<(result: BombeResult) => void>();
  const releaseListeners = new Set<() => void>();
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
      clearLamps: ok(),
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
      messageTypes: vi.fn().mockResolvedValue({ ok: true, value: messageTypes }),
      suggestCrib: vi.fn().mockResolvedValue({
        ok: true,
        value: { crib: 'WETTERVORHERSAGE', place: 'At or near the start, after at most a short prefix such as AN ALLE or the hour.' },
      }),
      getSolution: vi.fn().mockResolvedValue({
        ok: true,
        value: { reflector: 'B', wheelOrder: 'II V III', rings: [3, 14, 26], plugs: [], messageKey: 'ULA', plaintext: 'WETTERVORHERSAGE', notes: '' },
      }),
      loadIntercept: bombe(carterBombe),
      generateExercise: bombe(),
      showWheelOrders: bombe(),
      showCribPositions: bombe(),
      pasteCipherText: bombe(),
      setCrib: bombe(),
      placeCrib: bombe(),
      setMenu: bombe(),
      buildMenu: bombe(),
      menuStops: vi.fn().mockResolvedValue({ ok: true, value: { withBoard: 0.4, withoutBoard: 721.3 } }),
      configure: bombe(),
      plugUpMenu: bombe(carterMenu),
      plugJack: bombe(),
      fitRow: bombe(),
      removeDrum: bombe(),
      setTestRegister: bombe(),
      joinChains: bombe(),
      turnScrambler: bombe(),
      clearStops: bombe(),
      getPrintout: vi.fn().mockResolvedValue({ ok: true, value: [carterPrinted] }),
      clearPrintout: bombe(),
      setChecker: bombe(),
      pressCheckerKey: vi.fn().mockResolvedValue({ ok: true, value: { lamp: 'R', check: null } }),
      setUpChecker: bombe({
        ...carterMenu,
        run: { ...carterPaused, status: 'Finished', pause: null, stops: 2, allStops: 2 },
        stops: 2,
        checker: carterChecker,
      }),
      startRun: run(),
      setRunSpeed: run(),
      continueRun: run(),
      cancelRun: run({ ...carterPaused, status: 'Cancelled', pause: null, position: null }),
      getRun: run(),
      getStops: vi.fn().mockResolvedValue({ ok: true, value: carterStops }),
      getCheck: vi.fn().mockResolvedValue({ ok: true, value: carterCheck }),
      setCheck: vi.fn().mockResolvedValue({ ok: true, value: carterChecked }),
      confirmCheck: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          verdict: 'True',
          cribMismatches: [],
          cribUnknown: [],
          solution: { isTrueStop: true, verdictCorrect: true, wrongPairs: [], missingPairs: [] },
          check: { ...carterChecked, verdict: 'True', stop: { ...carterChecked.stop, verdict: 'True' } },
        },
      }),
      suggestSteckers: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          pairs: [
            { pair: 'IK', gain: 12.5 },
            { pair: 'OX', gain: 9.1 },
          ],
          steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW',
          decrypt: carterCrib,
        },
      }),
      findRightRing: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          rings: Array.from({ length: 26 }, (_, index) => ({ ring: index + 1, score: index < 20 ? 30 : 12 - index / 4, best: index < 20 })),
          check: { ...carterChecked, rightRing: 1 },
        },
      }),
      findMiddleRing: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          rings: Array.from({ length: 26 }, (_, index) => ({ ring: index + 1, score: index === 7 ? 25 : 30, best: index !== 7 })),
          check: { ...carterChecked, middleRing: 1, key: { ...carterChecked.key, rings: [26, 1, 26] } },
        },
      }),
      takePinch: bombe({ ...emptyBombe, day: fakeDay }),
      writeIndicator: bombe({ ...emptyBombe, day: fakeDay }),
      fillInIndicator: bombe({ ...emptyBombe, day: fakeDay }),
      getRingTable: vi.fn().mockResolvedValue({ ok: true, value: carterRingTable }),
      readRings: vi.fn().mockResolvedValue({ ok: true, value: carterRead }),
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
      openHut8Notebook: vi.fn().mockResolvedValue(undefined),
      openInstructions: vi.fn().mockResolvedValue(undefined),
      showMode: vi.fn().mockResolvedValue(undefined),
      onShowMode: vi.fn((listener: (mode: 'enigma' | 'bombe') => void) => {
        modeListeners.add(listener);
        return () => modeListeners.delete(listener);
      }),
      onMachineState: vi.fn((listener: (state: MachineState) => void) => {
        stateListeners.add(listener);
        return () => stateListeners.delete(listener);
      }),
      releaseCheckerKey: vi.fn().mockResolvedValue(undefined),
      onCheckerKeyReleased: vi.fn((listener: () => void) => {
        releaseListeners.add(listener);
        return () => releaseListeners.delete(listener);
      }),
      onBombeResult: vi.fn((listener: (result: BombeResult) => void) => {
        bombeListeners.add(listener);
        return () => bombeListeners.delete(listener);
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

  const pushMode = (mode: 'enigma' | 'bombe') => modeListeners.forEach((listener) => listener(mode));
  const pushBombeResult = (result: BombeResult) => bombeListeners.forEach((listener) => listener(result));

  return { api, pushStatus, pushState, pushKeySheetsChanged, pushMode, pushBombeResult };
}

/** The day of a pinched exercise: the broken message first, then two others. */
export const fakeDay: DayTraffic = {
  sheetId: 'sheet',
  network: 'Triton',
  month: '1944-06',
  day: 19,
  grundstellung: 'QRS',
  table: 3,
  swaps: ['AAZZ', 'ABZY', 'QWER', 'TZUI'],
  messages: [
    {
      message: '1840 = 32 = QWTZ ERUI SNMK GGST ZZUG ARLV QWTZ ERUI',
      indicator: 'QWTZ ERUI',
      schluesselkenngruppe: null,
      schluesselkenngruppeRight: null,
      verfahrenkenngruppe: null,
      verfahrenkenngruppeRight: null,
    },
    {
      message: '0412 = 28 = ABCD EFGH IJKL MNOP QRST ABCD EFGH',
      indicator: 'ABCD EFGH',
      schluesselkenngruppe: null,
      schluesselkenngruppeRight: null,
      verfahrenkenngruppe: null,
      verfahrenkenngruppeRight: null,
    },
    {
      message: '2215 = 24 = UVWX YZAB CDEF GHIJ UVWX YZAB',
      indicator: 'UVWX YZAB',
      schluesselkenngruppe: null,
      schluesselkenngruppeRight: null,
      verfahrenkenngruppe: null,
      verfahrenkenngruppeRight: null,
    },
  ],
};

/** The ring table of Carter's check: rings C and N lead to the stop's indicator DKX. */
export const carterRingTable: RingTable = {
  grundstellung: 'QRS',
  verfahrenkenngruppe: 'ABC',
  rightRing: 26,
  indicator: 'DKX',
  rows: Array.from({ length: 676 }, (_, index) => {
    const [left, middle] = [Math.floor(index / 26) + 1, (index % 26) + 1];
    const found = left === 3 && middle === 14;
    return { left, middle, spruchschluessel: found ? 'ULA' : trigram((index * 7) % 17576), indicator: found ? 'DKX' : trigram((index * 11 + 5) % 17576) };
  }),
};

/** Carter's check, confirmed true, with the rings C and N read from the indicator. */
export const carterRead: BombeCheck = {
  ...carterChecked,
  verdict: 'True',
  reading: {
    left: 3,
    middle: 14,
    key: { ...carterChecked.key, rings: [3, 14, 26], messageKey: 'ULA' },
    decrypt: carterCrib,
    fitsStop: true,
    differences: 0,
    ringsRight: true,
  },
};
