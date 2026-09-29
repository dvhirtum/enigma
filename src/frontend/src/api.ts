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

export interface Problem {
  status: number;
  title: string;
  detail?: string;
}

export type ApiResult<T> = { ok: true; value: T } | { ok: false; problem: Problem };

export type BackendStatus =
  | { state: 'starting' }
  | { state: 'running' }
  | { state: 'failed'; message: string };

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
  applyDailyKey: MachineCall<[sheetId: string, day: number]>;
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

/** An HTML document to print to the PDF file `name`. */
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
  /** Listens for machine states changed by another window. */
  onMachineState: (listener: (state: MachineState) => void) => () => void;
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
  files: FilesApi;
  clipboard: ClipboardApi;
  windows: WindowsApi;
  backend: BackendApi;
}
