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
}

export interface BackendApi {
  status: () => Promise<BackendStatus>;
  onStatus: (listener: (status: BackendStatus) => void) => () => void;
  restart: () => Promise<void>;
}

export interface EnigmaApi {
  health: () => Promise<ApiResult<Health>>;
  machine: MachineApi;
  backend: BackendApi;
}
