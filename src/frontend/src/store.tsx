import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type {
  ApiResult,
  BombeRun,
  BombeSettingsChange,
  BombeState,
  EnigmaApi,
  Intercept,
  Kenngruppenbuch,
  KeySheet,
  KeySheetFile,
  KeySheetSummary,
  MachineApi,
  MachineState,
  Problem,
  ReceivingKey,
} from './api';
import { shiftLetter, shiftRing } from './machine';
import { keySheetDocument, procedureDocument, procedureName } from './printSheet';
import { historicalSpeed } from './bombe/drums';
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
  deleteKeySheet: (id: string) => Promise<boolean>;
  /** Generates every month of the year for every network of the Kenngruppenbuch. */
  generateKeySheets: (model: string, year: number) => Promise<boolean>;
  /** Asks for a key sheet file and imports it. */
  importKeySheet: () => Promise<boolean>;
  /** Saves the open sheet to a file the user picks. */
  exportKeySheet: () => Promise<boolean>;
  /**
   * Prints the open sheet to a PDF the user picks. With `withProcedure` it also prints its Kenngruppenbuch and
   * Tauschtafeln to a second PDF, both in a folder the user picks.
   */
  printKeySheet: (withProcedure?: boolean) => Promise<boolean>;
}

/** Kenngruppenbücher by id, loaded when first needed. Books are cleared after sheets are generated or imported. */
export interface ProcedureSlice {
  books: Record<string, Kenngruppenbuch>;
  loadBook: (id: string) => Promise<boolean>;
  /** The key sheet days that fit a received message on Thu Sep 24 21:20:27 WEDT 2026 (yyyy-MM-dd), or null when the lookup failed. */
  findReceivingKeys: (message: string, date: string) => Promise<ReceivingKey[] | null>;
  /** Copies text to the clipboard; resolves to true when it worked. */
  copyText: (text: string) => Promise<boolean>;
}

/** The Bombe job. Each action resolves to true when the backend accepted it; problems go to `error`. */
export interface BombeSlice {
  bombe: BombeState | null;
  intercepts: Intercept[];
  /** Loads the job and the list of intercepts. */
  loadBombe: () => Promise<boolean>;
  loadIntercept: (id: string) => Promise<boolean>;
  generateExercise: () => Promise<boolean>;
  /** Loads a pasted radio message or bare cipher text; empty text clears the message. */
  pasteCipherText: (text: string) => Promise<boolean>;
  /** Replaces the crib, or removes it when empty. */
  setCrib: (crib: string) => Promise<boolean>;
  /** Places the crib at a position (0 = the first letter) and builds the menu. */
  placeCrib: (position: number) => Promise<boolean>;
  /** Plugs up links of the placed crib; without a test register letter one is chosen. */
  setMenu: (links: string[], testRegister?: string) => Promise<boolean>;
  /** Builds the menu from the placed crib again. */
  buildMenu: () => Promise<boolean>;
  /** Changes run settings; those left out stay as they are. */
  configureBombe: (settings: BombeSettingsChange) => Promise<boolean>;
  /** Starts a run at `speed` positions per second, or at full speed when null. */
  startRun: (speed: number | null) => Promise<boolean>;
  /** Continues a run paused at a stop. */
  continueRun: () => Promise<boolean>;
  cancelRun: () => Promise<boolean>;
  /** Fetches the progress of the run. */
  pollRun: () => Promise<boolean>;
  /** The run speed in positions per second, or null for full speed: for the next run, and the running one. */
  speed: number | null;
  chooseSpeed: (speed: number | null) => Promise<boolean>;
}

export interface MachineStore extends Actions, KeySheetSlice, ProcedureSlice, BombeSlice {
  machine: MachineState | null;
  version: string | null;
  error: Problem | null;
  load: () => Promise<void>;
  dismissError: () => void;
  /** Opens the operator's notebook window, or brings it to the front. */
  openNotebook: () => Promise<void>;
  /** Opens the instructions window, or brings it to the front. */
  openInstructions: () => Promise<void>;
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

export function createMachineStore({ machine: api, keySheets: sheets, procedure, bombe, files, clipboard, windows, health }: EnigmaApi): StoreApi<MachineStore> {
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
    const job = async (call: Promise<ApiResult<BombeState>>) => {
      const result = await check(call);
      if (result.ok) {
        set({ bombe: result.value });
      }
      return result.ok;
    };
    /** A run call; a poll leaves the error as it is unless the poll fails. A run the backend no longer has is dropped. */
    const run = async (call: Promise<ApiResult<BombeRun>>, poll = false) => {
      const result = poll ? await settle(call) : await check(call);
      if (poll && !result.ok) {
        set({ error: result.problem });
      }
      const current = get().bombe;
      if (current && (result.ok || result.problem.status === 404)) {
        set({ bombe: { ...current, run: result.ok ? result.value : null } });
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
      bombe: null,
      intercepts: [],
      speed: historicalSpeed,
      loadBombe: async () => {
        const [listed, state] = await Promise.all([settle(bombe.intercepts()), settle(bombe.getState())]);
        if (listed.ok) {
          set({ intercepts: listed.value });
        }
        if (state.ok) {
          set({ bombe: state.value });
        }
        const failed = [state, listed].find((result) => !result.ok);
        if (failed && !failed.ok) {
          set({ error: failed.problem });
        }
        return !failed;
      },
      loadIntercept: (id) => job(bombe.loadIntercept(id)),
      generateExercise: () => job(bombe.generateExercise()),
      pasteCipherText: (text) => job(bombe.pasteCipherText(text)),
      setCrib: (crib) => job(bombe.setCrib(crib)),
      placeCrib: (position) => job(bombe.placeCrib(position)),
      setMenu: (links, testRegister) => job(bombe.setMenu(links, testRegister)),
      buildMenu: () => job(bombe.buildMenu()),
      configureBombe: (settings) => job(bombe.configure(settings)),
      startRun: (speed) => run(bombe.startRun(speed)),
      continueRun: () => run(bombe.continueRun()),
      cancelRun: () => run(bombe.cancelRun()),
      pollRun: () => run(bombe.getRun(), true),
      chooseSpeed: async (speed) => {
        set({ speed });
        const status = get().bombe?.run?.status;
        return status === 'Running' || status === 'Paused' ? run(bombe.setRunSpeed(speed)) : true;
      },
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
      generateKeySheets: async (model, year) => {
        const result = await check(sheets.generate(model, year));
        if (!result.ok) {
          return false;
        }
        set({ books: {} });
        await loadKeySheets();
        return true;
      },
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
          return (await files.saveKeySheet(`${sheet.network}-${sheet.month}.json`, JSON.stringify(file))) !== null;
        } catch (error) {
          return fail({ status: 0, title: 'The file could not be saved.', detail: String(error) });
        }
      },
      printKeySheet: async (withProcedure = false) => {
        const sheet = get().keySheet;
        if (!sheet) {
          return false;
        }
        const result = await check(sheets.export(sheet.id));
        if (!result.ok) {
          return false;
        }
        const name = `${sheet.network}-${sheet.month}.pdf`;
        const html = keySheetDocument(result.value, sheet.model);
        const bookHtml = withProcedure ? procedureDocument(result.value) : null;
        try {
          if (bookHtml === null) {
            return (await files.printKeySheet(name, html)) !== null;
          }
          return (await files.printToFolder([{ name, html }, { name: `${procedureName(result.value)}.pdf`, html: bookHtml }])) !== null;
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
      openNotebook: () => windows.openNotebook(),
      openInstructions: () => windows.openInstructions(),
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

/** Provides the machine store, which follows machine states and key sheets changed by other windows. */
export function MachineStoreProvider({ api, children }: { api: EnigmaApi; children: ReactNode }) {
  const [store] = useState(() => createMachineStore(api));
  useEffect(() => api.windows.onMachineState((machine) => store.setState({ machine })), [api, store]);
  useEffect(
    () =>
      api.windows.onKeySheetsChanged(() => {
        store.setState({ books: {} });
        void store.getState().loadKeySheets();
      }),
    [api, store],
  );
  return <MachineStoreContext.Provider value={store}>{children}</MachineStoreContext.Provider>;
}

export function useMachine<T>(selector: (store: MachineStore) => T): T {
  const store = useContext(MachineStoreContext);
  if (!store) {
    throw new Error('useMachine must be used inside a MachineStoreProvider.');
  }
  return useStore(store, selector);
}
