import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type { ApiResult, EnigmaApi, MachineApi, MachineState, Problem } from './api';
import { shiftLetter } from './machine';
import { createQueue } from './queue';

/** Each action resolves to true when the backend accepted the operation. */
type Actions = { [K in Exclude<keyof MachineApi, 'getState'>]: (...args: Parameters<MachineApi[K]>) => Promise<boolean> };

export interface MachineStore extends Actions {
  machine: MachineState | null;
  version: string | null;
  error: Problem | null;
  load: () => Promise<void>;
  dismissError: () => void;
  /** Runs operations that depend on earlier ones one at a time, in order. */
  enqueue: <T>(task: () => Promise<T>) => Promise<T>;
  /** Turns a rotor `steps` letters on from its position once the queued operations are done. */
  stepRotor: (slot: string, steps: number) => Promise<boolean>;
}

async function settle<T>(call: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    return await call;
  } catch (error) {
    return { ok: false, problem: { status: 0, title: 'The call to the backend failed.', detail: String(error) } };
  }
}

export function createMachineStore({ machine: api, health }: EnigmaApi): StoreApi<MachineStore> {
  return createStore<MachineStore>()((set, get) => {
    const apply = async (call: Promise<ApiResult<MachineState>>) => {
      const result = await settle(call);
      set(result.ok ? { machine: result.value, error: null } : { error: result.problem });
      return result.ok;
    };
    const enqueue = createQueue();

    return {
      machine: null,
      version: null,
      error: null,
      load: async () => {
        const [state, info] = await Promise.all([settle(api.getState()), settle(health())]);
        set({
          machine: state.ok ? state.value : null,
          version: info.ok ? info.value.version : null,
          error: state.ok ? null : state.problem,
        });
      },
      dismissError: () => set({ error: null }),
      enqueue,
      stepRotor: (slot, steps) =>
        enqueue(async () => {
          const rotor = get().machine?.rotors.find((current) => current.slot === slot);
          return rotor ? apply(api.turnRotor(slot, shiftLetter(rotor.position, steps))) : false;
        }),
      create: (model) => apply(api.create(model)),
      insertRotors: (rotors) => apply(api.insertRotors(rotors)),
      removeRotors: () => apply(api.removeRotors()),
      turnRotor: (slot, position) => apply(api.turnRotor(slot, position)),
      setRingSetting: (rotor, ringSetting) => apply(api.setRingSetting(rotor, ringSetting)),
      setReflector: (reflector) => apply(api.setReflector(reflector)),
      connectPlug: (pair) => apply(api.connectPlug(pair)),
      disconnectPlug: (letter) => apply(api.disconnectPlug(letter)),
      movePlug: (from, to) => apply(api.movePlug(from, to)),
      pressKey: (key) => apply(api.pressKey(key)),
      releaseKey: () => apply(api.releaseKey()),
    };
  });
}

const MachineStoreContext = createContext<StoreApi<MachineStore> | null>(null);

export function MachineStoreProvider({ api, children }: { api: EnigmaApi; children: ReactNode }) {
  const [store] = useState(() => createMachineStore(api));
  return <MachineStoreContext.Provider value={store}>{children}</MachineStoreContext.Provider>;
}

export function useMachine<T>(selector: (store: MachineStore) => T): T {
  const store = useContext(MachineStoreContext);
  if (!store) {
    throw new Error('useMachine must be used inside a MachineStoreProvider.');
  }
  return useStore(store, selector);
}
