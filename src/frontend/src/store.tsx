import { createContext, useContext, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type {
  ApiResult,
  EnigmaApi,
  Kenngruppenbuch,
  KeySheet,
  KeySheetFile,
  KeySheetSummary,
  MachineApi,
  MachineState,
  Problem,
  ReceivingKey,
  TauschtafelSet,
} from './api';
import { shiftLetter, shiftRing } from './machine';
import { keySheetDocument } from './printSheet';
import { createQueue } from './queue';

/** Each action resolves to true when the backend accepted the operation. */
type Actions = { [K in Exclude<keyof MachineApi, 'getState'>]: (...args: Parameters<MachineApi[K]>) => Promise<boolean> };

/** Key sheet operations. Each resolves to true when it succeeded; problems go to `error`. */
export interface KeySheetSlice {
  keySheets: KeySheetSummary[];
  /** The sheet shown in the panel. */
  keySheet: KeySheet | null;
  loadKeySheets: () => Promise<boolean>;
  openKeySheet: (id: string | null) => Promise<boolean>;
  createKeySheet: (network: string, month: string, text: string) => Promise<boolean>;
  updateKeySheet: (id: string, network: string, month: string, text: string) => Promise<boolean>;
  deleteKeySheet: (id: string) => Promise<boolean>;
  generateKeySheet: (model: string, network: string, month: string) => Promise<boolean>;
  /** Asks for a key sheet file and imports it. */
  importKeySheet: () => Promise<boolean>;
  /** Saves the open sheet to a file the user picks. */
  exportKeySheet: () => Promise<boolean>;
  /** Prints the open sheet with its Kenngruppenbuch and Tauschtafeln to a PDF the user picks. */
  printKeySheet: () => Promise<boolean>;
}

/** Kenngruppenbücher and Tauschtafel sets by id, loaded when first needed. Books are cleared after a sheet is created, updated, generated or imported. */
export interface ProcedureSlice {
  books: Record<string, Kenngruppenbuch>;
  tables: Record<string, TauschtafelSet>;
  loadBook: (id: string) => Promise<boolean>;
  loadTables: (id: string) => Promise<boolean>;
  /** The key sheet days that fit a received message on Thu Sep 24 21:20:27 WEDT 2026 (yyyy-MM-dd), or null when the lookup failed. */
  findReceivingKeys: (message: string, date: string) => Promise<ReceivingKey[] | null>;
  /** Copies text to the clipboard; resolves to true when it worked. */
  copyText: (text: string) => Promise<boolean>;
}

export interface MachineStore extends Actions, KeySheetSlice, ProcedureSlice {
  machine: MachineState | null;
  version: string | null;
  error: Problem | null;
  load: () => Promise<void>;
  dismissError: () => void;
  /** Runs operations that depend on earlier ones one at a time, in order. */
  enqueue: <T>(task: () => Promise<T>) => Promise<T>;
  /** Turns a rotor `steps` letters on from its position once the queued operations are done. */
  stepRotor: (slot: string, steps: number) => Promise<boolean>;
  /** Turns the ring of a rotor in the box `steps` places on once the queued operations are done. */
  stepRing: (rotor: string, steps: number) => Promise<boolean>;
}

async function settle<T>(call: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  try {
    return await call;
  } catch (error) {
    return { ok: false, problem: { status: 0, title: 'The call to the backend failed.', detail: String(error) } };
  }
}

export function createMachineStore({ machine: api, keySheets: sheets, procedure, files, clipboard, health }: EnigmaApi): StoreApi<MachineStore> {
  return createStore<MachineStore>()((set, get) => {
    const apply = async (call: Promise<ApiResult<MachineState>>) => {
      const result = await settle(call);
      set(result.ok ? { machine: result.value, error: null } : { error: result.problem });
      return result.ok;
    };
    const enqueue = createQueue();

    const fail = (problem: Problem) => {
      set({ error: problem });
      return false;
    };
    const check = async <T,>(call: Promise<ApiResult<T>>) => {
      const result = await settle(call);
      set(result.ok ? { error: null } : { error: result.problem });
      return result;
    };
    const loadKeySheets = async () => {
      const result = await check(sheets.list());
      if (result.ok) {
        set({ keySheets: result.value });
      }
      return result.ok;
    };
    const show = async (call: Promise<ApiResult<KeySheet>>) => {
      const result = await check(call);
      if (!result.ok) {
        return false;
      }
      set({ keySheet: result.value, books: {} });
      await loadKeySheets();
      return true;
    };

    return {
      machine: null,
      version: null,
      error: null,
      keySheets: [],
      keySheet: null,
      books: {},
      tables: {},
      loadBook: async (id) => {
        if (get().books[id]) {
          return true;
        }
        const result = await check(procedure.getBook(id));
        if (result.ok) {
          set((state) => ({ books: { ...state.books, [id]: result.value } }));
        }
        return result.ok;
      },
      loadTables: async (id) => {
        if (get().tables[id]) {
          return true;
        }
        const result = await check(procedure.getTables(id));
        if (result.ok) {
          set((state) => ({ tables: { ...state.tables, [id]: result.value } }));
        }
        return result.ok;
      },
      findReceivingKeys: async (message, date) => {
        const result = await check(procedure.findReceivingKeys(message, date));
        return result.ok ? result.value : null;
      },
      copyText: async (text) => {
        try {
          await clipboard.writeText(text);
          return true;
        } catch (error) {
          return fail({ status: 0, title: 'The text could not be copied.', detail: String(error) });
        }
      },
      loadKeySheets,
      openKeySheet: async (id) => {
        if (id === null) {
          set({ keySheet: null });
          return true;
        }
        const result = await check(sheets.get(id));
        if (result.ok) {
          set({ keySheet: result.value });
        }
        return result.ok;
      },
      createKeySheet: (network, month, text) => show(sheets.create(network, month, text)),
      updateKeySheet: (id, network, month, text) => show(sheets.update(id, network, month, text)),
      generateKeySheet: (model, network, month) => show(sheets.generate(model, network, month)),
      deleteKeySheet: async (id) => {
        const result = await check(sheets.remove(id));
        if (!result.ok) {
          return false;
        }
        set((state) => ({ keySheet: state.keySheet?.id === id ? null : state.keySheet }));
        await loadKeySheets();
        return true;
      },
      importKeySheet: async () => {
        let content: string | null;
        try {
          content = await files.openKeySheet();
        } catch (error) {
          return fail({ status: 0, title: 'The file could not be read.', detail: String(error) });
        }
        if (content === null) {
          return false;
        }
        let file: KeySheetFile;
        try {
          file = JSON.parse(content) as KeySheetFile;
        } catch {
          return fail({ status: 0, title: 'The file is not a key sheet.', detail: 'It does not contain valid JSON.' });
        }
        return show(sheets.import(file));
      },
      exportKeySheet: async () => {
        const sheet = get().keySheet;
        if (!sheet) {
          return false;
        }
        const result = await check(sheets.export(sheet.id));
        if (!result.ok) {
          return false;
        }
        const { network, month, days, kenngruppenbuchId, tauschtafelSetId, kenngruppenbuch, tauschtafeln } = result.value;
        const file: KeySheetFile = { network, month, days, kenngruppenbuchId, tauschtafelSetId, kenngruppenbuch, tauschtafeln };
        try {
          return (await files.saveKeySheet(`${sheet.network}-${sheet.month}.json`, `${JSON.stringify(file, null, 2)}\n`)) !== null;
        } catch (error) {
          return fail({ status: 0, title: 'The file could not be saved.', detail: String(error) });
        }
      },
      printKeySheet: async () => {
        const sheet = get().keySheet;
        if (!sheet) {
          return false;
        }
        const result = await check(sheets.export(sheet.id));
        if (!result.ok) {
          return false;
        }
        try {
          return (await files.printKeySheet(`${sheet.network}-${sheet.month}.pdf`, keySheetDocument(result.value, sheet.model))) !== null;
        } catch (error) {
          return fail({ status: 0, title: 'The PDF could not be saved.', detail: String(error) });
        }
      },
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
      stepRing: (name, steps) =>
        enqueue(async () => {
          const rotor = get().machine?.rotorBox.find((current) => current.rotor === name);
          return rotor ? apply(api.setRingSetting(name, shiftRing(rotor.ringSetting, steps))) : false;
        }),
      create: (model) => apply(api.create(model)),
      insertRotor: (slot, rotor) => apply(api.insertRotor(slot, rotor)),
      removeRotor: (slot) => apply(api.removeRotor(slot)),
      turnRotor: (slot, position) => apply(api.turnRotor(slot, position)),
      setRingSetting: (rotor, ringSetting) => apply(api.setRingSetting(rotor, ringSetting)),
      setReflector: (reflector) => apply(api.setReflector(reflector)),
      connectPlug: (pair) => apply(api.connectPlug(pair)),
      disconnectPlug: (letter) => apply(api.disconnectPlug(letter)),
      movePlug: (from, to) => apply(api.movePlug(from, to)),
      pressKey: (key) => apply(api.pressKey(key)),
      releaseKey: () => apply(api.releaseKey()),
      applyDailyKey: (sheetId, day) => apply(api.applyDailyKey(sheetId, day)),
      startSending: () => apply(api.startSending()),
      startReceiving: (message, sheetId, day) => apply(api.startReceiving(message, sheetId, day)),
      chooseGroups: (schluesselkenngruppe, verfahrenkenngruppe, fillers) =>
        apply(api.chooseGroups(schluesselkenngruppe, verfahrenkenngruppe, fillers)),
      finishMessage: () => apply(api.finishMessage()),
      cancelOperator: () => apply(api.cancelOperator()),
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
