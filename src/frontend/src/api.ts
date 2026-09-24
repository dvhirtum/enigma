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
}

/** The daily key the machine was set up with; `modified` once the setup no longer matches it. */
export interface AppliedKey {
  sheetId: string;
  network: string;
  month: string;
  day: number;
  modified: boolean;
}

export interface DailyKey {
  day: number;
  reflector: string;
  /** Left to right; on the M4 the Greek rotor comes first. */
  rotors: string[];
  rings: number[];
  plugs: string[];
  kenngruppen: string[] | null;
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

/** A key sheet with its daily keys, and the same keys as text rows for the editor. */
export interface KeySheet extends KeySheetSummary {
  days: DailyKey[];
  text: string;
}

/** The contents of a key sheet file, as exported and imported. */
export interface KeySheetFile {
  network: string;
  month: string;
  days: DailyKey[];
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
}

type Call<Args extends unknown[], T> = (...args: Args) => Promise<ApiResult<T>>;

export interface KeySheetApi {
  list: Call<[], KeySheetSummary[]>;
  get: Call<[id: string], KeySheet>;
  create: Call<[network: string, month: string, text: string], KeySheet>;
  update: Call<[id: string, network: string, month: string, text: string], KeySheet>;
  remove: Call<[id: string], null>;
  generate: Call<[model: string, network: string, month: string], KeySheet>;
  import: Call<[file: KeySheetFile], KeySheet>;
}

/** Native file dialogs. Each resolves to null when the user cancels. */
export interface FilesApi {
  /** Returns the contents of the chosen file. */
  openKeySheet: () => Promise<string | null>;
  /** Returns the path the file was saved to. */
  saveKeySheet: (name: string, content: string) => Promise<string | null>;
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
  files: FilesApi;
  backend: BackendApi;
}
