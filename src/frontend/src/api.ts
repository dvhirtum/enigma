export interface Health {
  status: string;
  version: string;
}

export interface RotorState {
  rotor: string;
  ringSetting: number;
  position: string;
  slot: string | null;
}

export interface MachineState {
  model: string;
  reflector: string;
  rotors: RotorState[];
  rotorBox: RotorState[];
  plugs: string[];
  heldKey: string | null;
  litLamp: string | null;
  /** Every lamp lit since the record was last cleared. */
  lamps: string;
  appliedKey: AppliedKey | null;
  /** The running operator procedure, or null. */
  operator: OperatorState | null;
}

export type OperatorStep = 'ChooseGroups' | 'SetGrundstellung' | 'TypeVerfahrenkenngruppe' | 'SetSpruchschluessel' | 'TypeMessage' | 'Done';

/** The guided send or receive procedure. `typed` holds the keys typed for the message and `pad` the lamps they lit. */
export interface OperatorState {
  direction: 'Send' | 'Receive';
  step: OperatorStep;
  network: string;
  kenngruppenbuchId: string;
  table: number;
  grundstellung: string;
  schluesselkenngruppe: string | null;
  verfahrenkenngruppe: string | null;
  /** The filler letters before and after, such as "QX". */
  fillers: string;
  /** The vertical bigrams of the indicator and their swaps. */
  bigrams: { from: string; to: string }[];
  /** The two indicator groups, such as "QWER TZUI". */
  indicator: string | null;
  spruchschluesselLamps: string;
  spruchschluessel: string | null;
  typed: string;
  pad: string;
  expectedKey: string | null;
  fillersNeeded: number;
  cipherText: string | null;
  /** The radio message received, or sent once done. */
  message: string | null;
  warnings: string[];
}

/** A Kenngruppenbuch. Each column is 26 trigrams separated by spaces; columns are numbered from 1. */
export interface Kenngruppenbuch {
  id: string;
  created: string;
  verfahrenkenngruppen: { first: number; last: number };
  allotments: { network: string; first: number; last: number }[];
  columns: string[];
}

/** Bigram tables for one year. Each swap is 4 letters: "ABCD" swaps AB and CD. `calendar` gives the table per half month. */
export interface TauschtafelSet {
  id: string;
  year: number;
  tables: { number: number; swaps: string[] }[];
  calendar: number[];
}

/** The daily key the machine was set up with; `modified` once the setup no longer matches it. */
export interface AppliedKey {
  sheetId: string;
  network: string;
  month: string;
  day: number;
  modified: boolean;
  /** Null when the day gives none. */
  grundstellung: string | null;
}

export interface DailyKey {
  day: number;
  reflector: string;
  /** Left to right; on the M4 the Greek rotor comes first. */
  rotors: string[];
  rings: number[];
  plugs: string[];
  grundstellung: string | null;
}

export type Provenance = 'Historical' | 'Generated' | 'UserDefined';

export interface KeySheetSummary {
  id: string;
  network: string;
  /** yyyy-MM */
  month: string;
  model: string;
  provenance: Provenance;
  source: string | null;
  readOnly: boolean;
}

/** A key sheet with its daily keys. */
export interface KeySheet extends KeySheetSummary {
  days: DailyKey[];
  kenngruppenbuchId: string | null;
  tauschtafelSetId: string | null;
}

/** The contents of a key sheet file, as exported and imported. Exports also hold the linked Kenngruppenbuch and Tauschtafel set. */
export interface KeySheetFile {
  network: string;
  month: string;
  days: DailyKey[];
  kenngruppenbuchId?: string | null;
  tauschtafelSetId?: string | null;
  kenngruppenbuch?: Kenngruppenbuch;
  tauschtafeln?: TauschtafelSet;
}

/** The message the Bombe is to break. `message` is the Navy radio message, when it is one. */
export interface BombeSource {
  kind: 'Intercept' | 'Exercise' | 'Pasted';
  title: string;
  hint: string | null;
  transcript: string;
  message: string | null;
  hasCrib: boolean;
  hasSolution: boolean;
  hasWheelOrders: boolean;
  /** Three wheel orders, one of them the key's, once shown (null before). */
  wheelOrders: string[] | null;
}

/** A suggested crib and where in the message it is likely to stand (empty when unknown). */
export interface CribSuggestion {
  crib: string;
  place: string;
}

/** A kind of stereotyped message to suggest a crib for. */
export interface MessageType {
  id: string;
  name: string;
}

/** A crib position under the cipher text (0 = the first letter) and the crib indexes that crash. */
export interface Placement {
  position: number;
  crashes: number[];
}

/**
 * The menu links (letters, then offset), every link of the placed crib, the test register, the links connected to it,
 * their loops and the estimated false stops per wheel order with and without the diagonal board.
 */
export interface BombeMenu {
  links: string[];
  cribLinks: string[];
  testRegister: string;
  connectedLinks: string[];
  loops: number;
  stopsWithBoard: number;
  stopsWithoutBoard: number;
}

export interface BombeSettings {
  diagonalBoard: boolean;
  reflector: string;
}

/** A scrambler: the letters its two jacks are cabled to, its drums' rotors (upper, middle, lower) and start letters. */
export interface ScramblerSetup {
  jacks: (string | null)[];
  drums: (string | null)[];
  start: string;
}

/** A chain of 12 scramblers, with the letter its test register is plugged onto (null: none) and its input wire. */
export interface ChainSetup {
  testRegister: string | null;
  input: string;
  scramblers: ScramblerSetup[];
}

/**
 * The Bombe as set up by hand: its three chains, whether each is joined to the next, whether it is plugged up with the
 * notebook's menu or by hand, and what a run will not use.
 */
export interface BombeMachine {
  chains: ChainSetup[];
  joins: boolean[];
  pluggedForMenu: boolean;
  pluggedByHand: boolean;
  warnings: string[];
}

/**
 * The checking machine: reflector cartridge (null: none), whether the dummy drum is fitted, rotor of each drum left to
 * right (null: none), ring and window letters, and the stop the notebook set it up for (null when set by hand).
 */
export interface CheckingMachine {
  reflector: string | null;
  dummy: boolean;
  drums: (string | null)[];
  rings: string;
  windows: string;
  stop: BombeStop | null;
}

/**
 * A stop logged for the notebook: its index, the wheel order, drum core positions, indicator drum reading, test
 * register, its live wires, stecker partner and the verdict of its check.
 */
export interface BombeStop {
  index: number;
  wheelOrder: string;
  position: string;
  indicator: string;
  testRegister: string;
  liveWires: string;
  stecker: string | null;
  verdict: 'Unchecked' | 'True' | 'False';
}

/**
 * A stop as the Bombe prints it: its index on the printout, the chains (0 = chain 1), their wheel order (null when a
 * row is empty), the upper drums' letters, the indicator drum reading, the test register, its live wires and the
 * stecker they give.
 */
export interface PrintedStop {
  index: number;
  chains: number[];
  wheelOrder: string | null;
  drumLetters: string;
  indicator: string;
  testRegister: string;
  liveWires: string;
  stecker: string | null;
}

/**
 * A run's progress: the groups of chains tested, whether its stops go to the notebook, the positions tested of the
 * 17,576, the letters the upper drums show while it runs, the stop a paused run waits at, the stops it found, all
 * stops logged and all printed. Speed is in positions per second, null for full speed.
 */
export interface BombeRun {
  status: 'Running' | 'Paused' | 'Finished' | 'Cancelled' | 'Failed';
  speed: number | null;
  reflector: string;
  groups: { chains: number[]; wheelOrder: string | null; testRegister: string; input: string }[];
  logged: boolean;
  positionsTested: number;
  positions: number;
  position: string | null;
  pause: PrintedStop | null;
  stops: number;
  allStops: number;
  printed: number;
  error: string | null;
  elapsedSeconds: number;
}

/** Run settings to change; those left out stay as they are. */
export interface BombeSettingsChange {
  diagonalBoard?: boolean;
  reflector?: string;
}

/** A test register change: an empty letter unplugs it, an empty input uses the default; those left out stay. */
export interface TestRegisterChange {
  letter?: string;
  input?: string;
}

/** Checking machine fields to change; those left out stay as they are. An empty reflector takes the cartridge out. */
export interface CheckerChange {
  reflector?: string;
  dummy?: boolean;
  drums?: (string | null)[];
  rings?: string;
  windows?: string;
}

/**
 * The Bombe job: the message, the crib, every crib position, the placed one, the menu, the Bombe and the checking
 * machine as set up, the run settings, the latest run, the stops logged for the notebook and the stops printed.
 */
export interface BombeState {
  source: BombeSource | null;
  cipherText: string;
  crib: string | null;
  placements: Placement[];
  position: number | null;
  menu: BombeMenu | null;
  machine: BombeMachine;
  checker: CheckingMachine;
  settings: BombeSettings;
  run: BombeRun | null;
  stops: number;
  printed: number;
  /** The day's traffic once a pinch of the key sheet day is taken. */
  day: DayTraffic | null;
}

/** A message of the day: the radio message, its indicator groups and the groups written down (null: not yet), each marked right or wrong. */
export interface DayMessage {
  message: string;
  indicator: string;
  schluesselkenngruppe: string | null;
  schluesselkenngruppeRight: boolean | null;
  verfahrenkenngruppe: string | null;
  verfahrenkenngruppeRight: boolean | null;
}

/**
 * The day's traffic read with a pinch: the key sheet day, its Grundstellung, the bigram table in force (swaps such as
 * "ABCD": AB and CD swap) and the messages, the broken one first.
 */
export interface DayTraffic {
  sheetId: string;
  network: string;
  /** yyyy-MM */
  month: string;
  day: number;
  grundstellung: string;
  table: number;
  swaps: string[];
  messages: DayMessage[];
}

/** How a bundled intercept or an exercise was encrypted: its key (rings 1–26), message key, plain text and notes. */
export interface SourceSolution {
  reflector: string;
  wheelOrder: string;
  rings: number[];
  plugs: string[];
  messageKey: string;
  plaintext: string;
  notes: string;
}

/** A row of the ring table: left and middle rings (1–26), the Spruchschlüssel they give and the indicator reading of the cores it leads to at the crib. */
export interface RingRow {
  left: number;
  middle: number;
  spruchschluessel: string;
  indicator: string;
}

/** The ring table of a check: the Grundstellung and Verfahrenkenngruppe, the right ring, the stop's indicator reading and 676 rows. */
export interface RingTable {
  grundstellung: string;
  verfahrenkenngruppe: string;
  rightRing: number;
  indicator: string;
  rows: RingRow[];
}

/** The rings read from the indicator: the whole key (the Spruchschlüssel as message key), its decrypt, and whether the rings are right (null without a solution). */
export interface Reading {
  left: number;
  middle: number;
  key: CheckedKey;
  decrypt: string;
  /** Whether the rings lead to the stop's cores at the crib. */
  fitsStop: boolean;
  /** How many letters the decrypt reads differently from the check's decrypt, with its middle ring. */
  differences: number;
  ringsRight: boolean | null;
}

/** The groups of an indicator to write down; those left out stay, an empty one is rubbed out. */
export interface IndicatorChange {
  schluesselkenngruppe?: string;
  verfahrenkenngruppe?: string;
}

/** A crib letter at its offset, and whether the steckers found so far encipher it to its cipher letter. */
export interface CribLetter {
  offset: number;
  plain: string;
  cipher: string;
  match: 'Match' | 'Mismatch' | 'Unknown';
}

/** The key a check gives: rings 1–26 (left and middle stay 26, unknown until the indicators are read). */
export interface CheckedKey {
  reflector: string;
  wheelOrder: string;
  rings: number[];
  plugs: string[];
  messageKey: string;
}

/**
 * The check of a stop: the stecker sheet as written ("AD ET EX RR", contradictions and all), the middle and right rings (1–26),
 * the verdict, each crib letter's match, the decrypt (unknown letters taken as unsteckered) and the key.
 */
export interface BombeCheck {
  stop: BombeStop;
  steckers: string;
  /** The letters with more than one partner written. */
  contradicted: string;
  /** The steckers found by checking, as they stood when the stop was confirmed true; empty otherwise. */
  checkedSteckers: string;
  middleRing: number;
  rightRing: number;
  verdict: BombeStop['verdict'];
  crib: CribLetter[];
  decrypt: string;
  key: CheckedKey;
  /** The rings read from the indicator, or null. */
  reading: Reading | null;
}

/** The lamp a key lit, and the check of the stop the checking machine is set up for, with what the lamp wrote down. */
export interface CheckerPress {
  lamp: string;
  check: BombeCheck | null;
}

/** Check fields to change; those left out stay as they are. */
export interface CheckChange {
  steckers?: string;
  rightRing?: number;
  middleRing?: number;
}

/** How a verdict compares with the message's solution. */
export interface SolutionComparison {
  isTrueStop: boolean;
  verdictCorrect: boolean;
  wrongPairs: string[];
  missingPairs: string[];
}

/** A verdict with the crib offsets that mismatch or are unknown, the comparison with the solution (when there is one) and the check. */
export interface Confirmation {
  verdict: BombeStop['verdict'];
  cribMismatches: number[];
  cribUnknown: number[];
  solution: SolutionComparison | null;
  check: BombeCheck;
}

/** Proposed steckers with their gain, the steckers with them all added, and the decrypt they give. */
export interface Suggestion {
  pairs: { pair: string; gain: number }[];
  steckers: string;
  decrypt: string;
}

/** Each right ring's score (null when no three letters in a row are known) and whether it is the best; the check with the ring set. */
export interface RingFind {
  rings: { ring: number; score: number | null; best: boolean }[];
  check: BombeCheck;
}

/** A whole key for the Enigma: rotors left to right, rings 1–26, plug pairs and window letters. */
export interface MachineKey {
  reflector: string;
  rotors: string[];
  rings: number[];
  plugs: string[];
  positions: string;
}

/** A bundled historical intercept. The date is yyyy-MM-dd, or null when unknown. */
export interface Intercept {
  id: string;
  title: string;
  date: string | null;
  hint: string | null;
}

export interface Problem {
  status: number;
  title: string;
  detail?: string;
}

export type ApiResult<T> = { ok: true; value: T } | { ok: false; problem: Problem };

export type BackendStatus = { state: 'starting' } | { state: 'running' } | { state: 'failed'; message: string };

type MachineCall<Args extends unknown[]> = (...args: Args) => Promise<ApiResult<MachineState>>;

export interface MachineApi {
  getState: MachineCall<[]>;
  create: MachineCall<[model: string]>;
  insertRotor: MachineCall<[slot: string, rotor: string]>;
  removeRotor: MachineCall<[slot: string]>;
  turnRotor: MachineCall<[slot: string, position: string]>;
  setRingSetting: MachineCall<[rotor: string, ringSetting: number]>;
  setReflector: MachineCall<[reflector: string]>;
  connectPlug: MachineCall<[pair: string]>;
  disconnectPlug: MachineCall<[letter: string]>;
  movePlug: MachineCall<[from: string, to: string]>;
  pressKey: MachineCall<[key: string]>;
  releaseKey: MachineCall<[]>;
  /** Clears the record of lit lamps. */
  clearLamps: MachineCall<[]>;
  applyDailyKey: MachineCall<[sheetId: string, day: number]>;
  /** Replaces the machine with one set up with the whole key. */
  setUpMachine: MachineCall<[key: MachineKey]>;
  startSending: MachineCall<[]>;
  /** Starts receiving; with a sheet and day, applies that key first, otherwise uses the applied key as it is. */
  startReceiving: MachineCall<[message: string, sheetId?: string, day?: number]>;
  chooseGroups: MachineCall<[schluesselkenngruppe: string, verfahrenkenngruppe: string, fillers: string]>;
  finishMessage: MachineCall<[]>;
  cancelOperator: MachineCall<[]>;
}

type Call<Args extends unknown[], T> = (...args: Args) => Promise<ApiResult<T>>;

export interface KeySheetApi {
  list: Call<[], KeySheetSummary[]>;
  get: Call<[id: string], KeySheet>;
  remove: Call<[id: string], null>;
  /** Generates every month of the year for every network of the Kenngruppenbuch. */
  generate: Call<[model: string, year: number], KeySheetSummary[]>;
  import: Call<[file: KeySheetFile], KeySheet>;
  export: Call<[id: string], KeySheetFile>;
}

/** A key sheet day whose network the Schlüsselkenngruppe of a received message is allotted to. */
export interface ReceivingKey {
  sheetId: string;
  network: string;
  month: string;
  day: number;
  model: string;
  schluesselkenngruppe: string;
}

export interface ProcedureApi {
  getBook: Call<[id: string], Kenngruppenbuch>;
  /** Thu Sep 24 21:20:27 WEDT 2026 is yyyy-MM-dd. */
  findReceivingKeys: Call<[message: string, date: string], ReceivingKey[]>;
}

export interface BombeApi {
  getState: Call<[], BombeState>;
  intercepts: Call<[], Intercept[]>;
  messageTypes: Call<[], MessageType[]>;
  /** The likely crib of the loaded message: its own, or else that of the message type `type`. */
  suggestCrib: Call<[type?: string], CribSuggestion>;
  /** The key and plain text of the loaded intercept or exercise. */
  getSolution: Call<[], SourceSolution>;
  /** Shows three wheel orders of the loaded intercept or exercise, one of them the key's. */
  showWheelOrders: Call<[], BombeState>;
  loadIntercept: Call<[id: string], BombeState>;
  generateExercise: Call<[], BombeState>;
  /** Loads a pasted radio message or bare cipher text; empty text clears the message. */
  pasteCipherText: Call<[text: string], BombeState>;
  /** Replaces the crib, or removes it when empty. */
  setCrib: Call<[crib: string], BombeState>;
  /** Places the crib at a position (0 = the first letter) and builds the menu. */
  placeCrib: Call<[position: number], BombeState>;
  /** Plugs up links of the placed crib, such as "SW1"; without a test register letter one is chosen. */
  setMenu: Call<[links: string[], testRegister?: string], BombeState>;
  /** Builds the menu from the placed crib again. */
  buildMenu: Call<[], BombeState>;
  configure: Call<[settings: BombeSettingsChange], BombeState>;
  /** Plugs up the Bombe with the menu. */
  plugUpMenu: Call<[], BombeState>;
  /** Cables a jack (0 or 1) of a scrambler (0 = the first of the chain) to a letter's common; null unplugs it. */
  plugJack: Call<[chain: number, scrambler: number, jack: number, letter: string | null], BombeState>;
  /** Fits drums of a rotor in a row (0 = upper) of a chain on its scramblers 0 up to `upTo`, and takes the rest of the row out. */
  fitRow: Call<[chain: number, row: number, upTo: number, rotor: string], BombeState>;
  /** Takes one drum (row 0 = upper) of a scrambler back to the rack. */
  removeDrum: Call<[chain: number, scrambler: number, row: number], BombeState>;
  /** Sets the start letters of a scrambler of a chain. */
  turnScrambler: Call<[chain: number, scrambler: number, start: string], BombeState>;
  setTestRegister: Call<[chain: number, change: TestRegisterChange], BombeState>;
  /** Joins chain `join` + 1 to the next one, or parts them. */
  joinChains: Call<[join: number, joined: boolean], BombeState>;
  /**
   * Starts a run at `speed` positions per second, or at full speed when null. The main process adds `notebook`: whether
   * the Hut 8 notebook is open, so the stops are logged for it.
   */
  startRun: Call<[speed: number | null, notebook?: boolean], BombeRun>;
  setRunSpeed: Call<[speed: number | null], BombeRun>;
  /** Continues a run paused at a stop. */
  continueRun: Call<[], BombeRun>;
  cancelRun: Call<[], BombeRun>;
  getRun: Call<[], BombeRun>;
  /** The stops found from index `from` on, at most `count`. */
  getStops: Call<[from: number, count: number], BombeStop[]>;
  /** Clears the stops found and their checks. */
  clearStops: Call<[], BombeState>;
  /** The printed stops from index `from` on, at most `count`. */
  getPrintout: Call<[from: number, count: number], PrintedStop[]>;
  clearPrintout: Call<[], BombeState>;
  setChecker: Call<[change: CheckerChange], BombeState>;
  /** Presses a key on the checking machine; resolves to the lamp that lights and the check it wrote the lamp into. */
  pressCheckerKey: Call<[key: string], CheckerPress>;
  /** Sets the checking machine up for a logged stop: its reflector and drums, the rings at its indicator, the windows at ZZZ. */
  setUpChecker: Call<[stop: number], BombeState>;
  getCheck: Call<[stop: number], BombeCheck>;
  setCheck: Call<[stop: number, change: CheckChange], BombeCheck>;
  confirmCheck: Call<[stop: number, verdict: BombeStop['verdict']], Confirmation>;
  /** Proposes steckers for the unknown letters, without setting them. */
  suggestSteckers: Call<[stop: number], Suggestion>;
  /** Scores the 26 right rings and sets the lowest best. */
  findRightRing: Call<[stop: number], RingFind>;
  /** Scores the 26 middle rings and sets the lowest best. */
  findMiddleRing: Call<[stop: number], RingFind>;
  /** Takes a pinch of the message's key sheet day: an exercise's own, or for a pasted radio message the sheet and day given. */
  takePinch: Call<[sheetId?: string, day?: number], BombeState>;
  /** Writes down the groups of the indicator of a message of the day (0 = the broken message). */
  writeIndicator: Call<[message: number, change: IndicatorChange], BombeState>;
  fillInIndicator: Call<[message: number], BombeState>;
  getRingTable: Call<[stop: number], RingTable>;
  /** Reads the left and middle rings (1–26) off the ring table; null forgets them. */
  readRings: Call<[stop: number, left: number | null, middle: number | null], BombeCheck>;
}

/** An HTML document to print to the PDF file `name`. */
/** A Bombe call another window made: the operation, its arguments and the value it returned. */
export interface BombeResult {
  name: keyof BombeApi;
  args: unknown[];
  value: unknown;
}

export interface PrintDocument {
  name: string;
  html: string;
}

/** Native file dialogs. Each resolves to null when the user cancels. */
export interface FilesApi {
  /** Returns the contents of the chosen file. */
  openKeySheet: () => Promise<string | null>;
  /** Returns the path the file was saved to. */
  saveKeySheet: (name: string, content: string) => Promise<string | null>;
  /** Prints the HTML document to a PDF file; returns the path it was saved to. */
  printKeySheet: (name: string, html: string) => Promise<string | null>;
  /** Prints each HTML document to a PDF file with its name in a folder the user picks; returns the folder. */
  printToFolder: (documents: PrintDocument[]) => Promise<string | null>;
}

/** The system clipboard, written by the main process. */
export interface ClipboardApi {
  writeText: (text: string) => Promise<void>;
}

export interface WindowsApi {
  /** Opens the operator's notebook window, or brings it to the front. */
  openNotebook: () => Promise<void>;
  /** Opens the Hut 8 notebook window, or brings it to the front. */
  openHut8Notebook: () => Promise<void>;
  /** Opens the instructions window, or brings it to the front. */
  openInstructions: () => Promise<void>;
  /** Shows a mode in the machine window. */
  showMode: (mode: 'enigma' | 'bombe') => Promise<void>;
  /** Listens for requests from another window to show a mode. */
  onShowMode: (listener: (mode: 'enigma' | 'bombe') => void) => () => void;
  /** Listens for machine states changed by another window. */
  onMachineState: (listener: (state: MachineState) => void) => () => void;
  /** Tells the other windows that the checking machine key held here was released. */
  releaseCheckerKey: () => Promise<void>;
  /** Listens for checking machine keys released in another window. */
  onCheckerKeyReleased: (listener: () => void) => () => void;
  /** Listens for the results of Bombe calls made by another window. */
  onBombeResult: (listener: (result: BombeResult) => void) => () => void;
  /** Listens for key sheets generated, imported or deleted by another window. */
  onKeySheetsChanged: (listener: () => void) => () => void;
}

export interface BackendApi {
  status: () => Promise<BackendStatus>;
  onStatus: (listener: (status: BackendStatus) => void) => () => void;
  restart: () => Promise<void>;
}

export interface EnigmaApi {
  health: () => Promise<ApiResult<Health>>;
  machine: MachineApi;
  keySheets: KeySheetApi;
  procedure: ProcedureApi;
  bombe: BombeApi;
  files: FilesApi;
  clipboard: ClipboardApi;
  windows: WindowsApi;
  backend: BackendApi;
}
