import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { createStore, useStore, type StoreApi } from 'zustand';
import type {
  ApiResult,
  BombeCheck,
  BombeResult,
  BombeRun,
  BombeSettingsChange,
  BombeState,
  BombeStop,
  CheckChange,
  CheckerChange,
  PrintedStop,
  TestRegisterChange,
  Confirmation,
  RingFind,
  Suggestion,
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
import { withPartner } from './bombe/steckers';
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
  /** Plugs up the Bombe with the menu. */
  plugUpMenu: () => Promise<boolean>;
  /** Cables a jack (0 or 1) of a scrambler to a letter's common; null unplugs it. */
  plugJack: (chain: number, scrambler: number, jack: number, letter: string | null) => Promise<boolean>;
  /** Fits drums of a rotor in a row (0 = upper) of a chain on its scramblers 0 up to `upTo`. */
  fitRow: (chain: number, row: number, upTo: number, rotor: string) => Promise<boolean>;
  /** Takes one drum (row 0 = upper) of a scrambler back to the rack. */
  removeDrum: (chain: number, scrambler: number, row: number) => Promise<boolean>;
  /** Sets the start letters of a scrambler of a chain. */
  turnScrambler: (chain: number, scrambler: number, start: string) => Promise<boolean>;
  setTestRegister: (chain: number, change: TestRegisterChange) => Promise<boolean>;
  joinChains: (join: number, joined: boolean) => Promise<boolean>;
  /** The printed stops fetched so far, from the first. */
  printout: PrintedStop[];
  /** Fetches the first page of the printout again, or with `more` the next page. */
  loadPrintout: (more?: boolean) => Promise<boolean>;
  clearPrintout: () => Promise<boolean>;
  /** Clears the stops found and their checks. */
  clearStops: () => Promise<boolean>;
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
  /** The Bombe view shown. */
  bombeView: string;
  showBombeView: (id: string) => void;
  /** The stops fetched so far, from the first. */
  stops: BombeStop[];
  /** Fetches the first page of stops again, or with `more` the next page. */
  loadStops: (more?: boolean) => Promise<boolean>;
  /** The check open in the notebook, and its last suggestion, ring scores and confirmation. */
  check: BombeCheck | null;
  /** The lamp lit on the checking machine. */
  checkLamp: string | null;
  suggestion: Suggestion | null;
  ringScores: RingFind['rings'] | null;
  confirmation: Confirmation | null;
  /** Opens the check of a stop on the Checking view. */
  openCheck: (stop: number) => Promise<boolean>;
  /** Follows a Bombe call another window made. */
  receiveBombe: (result: BombeResult) => void;
  changeCheck: (change: CheckChange) => Promise<boolean>;
  /** Pairs `letter` with `partner` (itself: unsteckered; null: unknown) once the queued operations are done. */
  setPartner: (letter: string, partner: string | null) => Promise<boolean>;
  /** Turns the right ring `steps` places on once the queued operations are done. */
  stepRightRing: (steps: number) => Promise<boolean>;
  /** Changes the checking machine once the queued operations are done. */
  setChecker: (change: CheckerChange) => Promise<boolean>;
  /** Sets the checking machine up for a logged stop, and shows it. */
  setUpChecker: (stop: number) => Promise<boolean>;
  /** Turns a checking machine drum (0 = left) `steps` letters on once the queued operations are done. */
  stepCheckDrum: (drum: number, steps: number) => Promise<boolean>;
  /** Turns a checking machine ring (0 = left) `steps` letters on once the queued operations are done. */
  stepCheckRing: (drum: number, steps: number) => Promise<boolean>;
  /** Presses a key on the checking machine; its lamp stays lit until `releaseCheckKey`. */
  pressCheckKey: (key: string) => Promise<boolean>;
  releaseCheckKey: () => void;
  confirmCheck: (verdict: BombeStop['verdict']) => Promise<boolean>;
  suggestSteckers: () => Promise<boolean>;
  /** Adds proposed pairs, such as "IK", to the check's steckers. */
  acceptSuggestion: (pairs: string[]) => Promise<boolean>;
  findRightRing: () => Promise<boolean>;
  /** Sets up the Enigma with the check's key, at the message key. */
  setUpEnigma: () => Promise<boolean>;
}

/** How many stops a page of the Stops view fetches. */
export const stopPage = 100;

export interface MachineStore extends Actions, KeySheetSlice, ProcedureSlice, BombeSlice {
  machine: MachineState | null;
  version: string | null;
  error: Problem | null;
  load: () => Promise<void>;
  dismissError: () => void;
  /** Opens the operator's notebook window, or brings it to the front. */
  openNotebook: () => Promise<void>;
  /** Opens the Hut 8 notebook window, or brings it to the front. */
  openHut8Notebook: () => Promise<void>;
  /** Opens the instructions window, or brings it to the front. */
  openInstructions: () => Promise<void>;
  /** Shows a mode in the machine window. */
  showMode: (mode: 'enigma' | 'bombe') => Promise<void>;
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
    // Counters that let late replies be dropped: of stop and printout loads, of check openings and of checking machine key presses.
    let stopLoads = 0;
    let printoutLoads = 0;
    let checkOpenings = 0;
    let keyPresses = 0;
    /** Forgets the stops and the check, when the backend cleared them. */
    const forgetStops = () => {
      stopLoads++;
      checkOpenings++;
      set({ stops: [], check: null, suggestion: null, ringScores: null, confirmation: null });
    };
    /** Forgets the printout fetched when the backend has fewer stops printed. */
    const followPrinted = (printed: number) => {
      if (printed < get().printout.length || printed === 0) {
        printoutLoads++;
        set({ printout: [] });
      }
    };
    const applyJob = (value: BombeState) => {
      set({ bombe: value });
      if (value.stops < get().stops.length || value.stops === 0) {
        forgetStops();
      }
      followPrinted(value.printed);
    };
    const job = async (call: Promise<ApiResult<BombeState>>) => {
      const result = await check(call);
      if (result.ok) {
        applyJob(result.value);
      }
      return result.ok;
    };
    /** Shows a check that was just opened, here or in another window. */
    const showCheck = (value: BombeCheck) => {
      checkOpenings++;
      set({ check: value, suggestion: null, ringScores: null, confirmation: null });
    };
    /** Shows the checking machine once it is set up for a stop, here or in another window. */
    const showChecker = (value: BombeState) => {
      applyJob(value);
      keyPresses++;
      set({ checkLamp: null, bombeView: 'bombe-checking' });
    };
    /** Follows a check changed in another window, when it is the open one. */
    const followCheck = (next: BombeCheck, changes: Partial<MachineStore> = {}) => {
      set((state) => ({
        stops: state.stops.map((stop) => (stop.index === next.stop.index ? next.stop : stop)),
        ...(state.check?.stop.index === next.stop.index ? { check: next, ...changes } : {}),
      }));
    };
    /** Whether the check of `stop` is still the open one. */
    const stillOpen = (stop: number) => get().check?.stop.index === stop;
    /** A call on the open check; the check and the stop's verdict follow the result, unless another check was opened meanwhile. */
    const onCheck = async <T,>(call: (stop: number) => Promise<ApiResult<T>>, checkOf: (value: T) => BombeCheck, changes: Partial<MachineStore> = {}) => {
      const current = get().check;
      if (!current) {
        return null;
      }
      const result = await check(call(current.stop.index));
      if (!result.ok || !stillOpen(current.stop.index)) {
        return null;
      }
      const next = checkOf(result.value);
      set((state) => ({
        check: next,
        stops: state.stops.map((stop) => (stop.index === next.stop.index ? next.stop : stop)),
        ...changes,
      }));
      return result.value;
    };
    /** Turns one drum's window letter or ring letter on the checking machine `steps` letters on. */
    const stepChecker = async (field: 'windows' | 'rings', drum: number, steps: number) => {
      const letters = get().bombe?.checker[field];
      if (!letters) {
        return false;
      }
      const turned = [...letters];
      turned[drum] = shiftLetter(turned[drum], steps);
      return job(bombe.setChecker({ [field]: turned.join('') }));
    };
    /** Follows a run, or its end when the backend no longer has it. */
    const applyRun = (value: BombeRun | null) => {
      const current = get().bombe;
      if (current) {
        set({ bombe: { ...current, run: value, stops: value ? value.allStops : current.stops, printed: value ? value.printed : current.printed } });
      }
    };
    /** A run call; a poll leaves the error as it is unless the poll fails. A run the backend no longer has is dropped. */
    const run = async (call: Promise<ApiResult<BombeRun>>, poll = false) => {
      const result = poll ? await settle(call) : await check(call);
      if (poll && !result.ok) {
        set({ error: result.problem });
      }
      if (result.ok || result.problem.status === 404) {
        applyRun(result.ok ? result.value : null);
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
      bombeView: 'bombe-front',
      stops: [],
      printout: [],
      check: null,
      checkLamp: null,
      suggestion: null,
      ringScores: null,
      confirmation: null,
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
      plugUpMenu: () => job(bombe.plugUpMenu()),
      plugJack: (chain, scrambler, jack, letter) => job(bombe.plugJack(chain, scrambler, jack, letter)),
      fitRow: (chain, row, upTo, rotor) => job(bombe.fitRow(chain, row, upTo, rotor)),
      removeDrum: (chain, scrambler, row) => job(bombe.removeDrum(chain, scrambler, row)),
      turnScrambler: (chain, scrambler, start) => enqueue(() => job(bombe.turnScrambler(chain, scrambler, start))),
      setTestRegister: (chain, change) => job(bombe.setTestRegister(chain, change)),
      joinChains: (join, joined) => job(bombe.joinChains(join, joined)),
      clearPrintout: () => job(bombe.clearPrintout()),
      clearStops: () => job(bombe.clearStops()),
      startRun: (speed) => run(bombe.startRun(speed)),
      continueRun: () => run(bombe.continueRun()),
      cancelRun: () => run(bombe.cancelRun()),
      pollRun: () => run(bombe.getRun(), true),
      chooseSpeed: async (speed) => {
        set({ speed });
        const status = get().bombe?.run?.status;
        return status === 'Running' || status === 'Paused' ? run(bombe.setRunSpeed(speed)) : true;
      },
      showBombeView: (id) => set({ bombeView: id }),
      loadStops: async (more = false) => {
        // A first page drops the loads before it; a next page is dropped when the list changed meanwhile.
        const load = more ? stopLoads : ++stopLoads;
        const from = more ? get().stops.length : 0;
        const result = await check(bombe.getStops(from, stopPage));
        if (result.ok && load === stopLoads && (!more || get().stops.length === from)) {
          set((state) => ({ stops: more ? [...state.stops, ...result.value] : result.value }));
        }
        return result.ok;
      },
      loadPrintout: async (more = false) => {
        const load = more ? printoutLoads : ++printoutLoads;
        const from = more ? get().printout.length : 0;
        const result = await check(bombe.getPrintout(from, stopPage));
        if (result.ok && load === printoutLoads && (!more || get().printout.length === from)) {
          set((state) => ({ printout: more ? [...state.printout, ...result.value] : result.value }));
        }
        return result.ok;
      },
      openCheck: async (stop) => {
        const opening = ++checkOpenings;
        const result = await check(bombe.getCheck(stop));
        if (result.ok && opening === checkOpenings) {
          showCheck(result.value);
        }
        return result.ok;
      },
      receiveBombe: ({ name, args, value }) => {
        switch (name) {
          case 'startRun':
          case 'setRunSpeed':
          case 'continueRun':
          case 'cancelRun':
          case 'getRun': {
            const current = value as BombeRun;
            applyRun(current);
            if (name === 'startRun' || name === 'setRunSpeed') {
              set({ speed: current.speed });
            }
            return;
          }
          case 'setUpChecker':
            showChecker(value as BombeState);
            return;
          case 'getCheck':
            showCheck(value as BombeCheck);
            return;
          case 'setCheck': {
            const next = value as BombeCheck;
            const steckersChanged = get().check?.steckers !== next.steckers;
            followCheck(next, { confirmation: null, ...(steckersChanged ? { suggestion: null, ringScores: null } : {}) });
            return;
          }
          case 'confirmCheck': {
            const confirmation = value as Confirmation;
            followCheck(confirmation.check, { confirmation });
            return;
          }
          case 'findRightRing': {
            const found = value as RingFind;
            followCheck(found.check, { ringScores: found.rings, confirmation: null });
            return;
          }
          case 'suggestSteckers':
            if (get().check?.stop.index === args[0]) {
              set({ suggestion: value as Suggestion });
            }
            return;
          case 'getState':
          case 'intercepts':
          case 'getStops':
          case 'getPrintout':
          case 'pressCheckerKey':
            return;
          default:
            applyJob(value as BombeState);
        }
      },
      changeCheck: async (change) => {
        const steckers = change.steckers !== undefined ? { suggestion: null, ringScores: null } : {};
        return (await onCheck((stop) => bombe.setCheck(stop, change), (value) => value, { ...steckers, confirmation: null })) !== null;
      },
      setChecker: (change) => enqueue(() => job(bombe.setChecker(change))),
      setUpChecker: async (stop) => {
        const result = await check(bombe.setUpChecker(stop));
        if (result.ok) {
          showChecker(result.value);
        }
        return result.ok;
      },
      stepCheckDrum: (drum, steps) => enqueue(() => stepChecker('windows', drum, steps)),
      stepCheckRing: (drum, steps) => enqueue(() => stepChecker('rings', drum, steps)),
      setPartner: (letter, partner) =>
        enqueue(async () => {
          const steckers = get().check?.steckers;
          return steckers !== undefined && get().changeCheck({ steckers: withPartner(steckers, letter, partner) });
        }),
      stepRightRing: (steps) =>
        enqueue(async () => {
          const ring = get().check?.rightRing;
          return ring !== undefined && get().changeCheck({ rightRing: ((ring - 1 + steps + 26 * 26) % 26) + 1 });
        }),
      pressCheckKey: async (key) => {
        const press = ++keyPresses;
        const result = await check(bombe.pressCheckerKey(key));
        // A key released before the lamp came back leaves it dark.
        if (result.ok && press === keyPresses) {
          set({ checkLamp: result.value.lamp });
        }
        return result.ok;
      },
      releaseCheckKey: () => {
        keyPresses++;
        set({ checkLamp: null });
      },
      confirmCheck: async (verdict) => {
        const confirmation = await onCheck((stop) => bombe.confirmCheck(stop, verdict), (value) => value.check);
        if (confirmation) {
          set({ confirmation });
        }
        return confirmation !== null;
      },
      suggestSteckers: async () => {
        const current = get().check;
        if (!current) {
          return false;
        }
        const result = await check(bombe.suggestSteckers(current.stop.index));
        if (result.ok && stillOpen(current.stop.index)) {
          set({ suggestion: result.value });
        }
        return result.ok;
      },
      acceptSuggestion: (pairs) =>
        enqueue(async () => {
          const current = get().check;
          if (!current || pairs.length === 0) {
            return false;
          }
          const steckers = [current.steckers, ...pairs].filter(Boolean).join(' ');
          const accepted = await onCheck((stop) => bombe.setCheck(stop, { steckers }), (value) => value, { ringScores: null, confirmation: null });
          const suggestion = get().suggestion;
          if (accepted && suggestion) {
            const left = suggestion.pairs.filter((pair) => !pairs.includes(pair.pair));
            set({ suggestion: left.length > 0 ? { ...suggestion, pairs: left } : null });
          }
          return accepted !== null;
        }),
      findRightRing: async () => {
        const found = await onCheck((stop) => bombe.findRightRing(stop), (value) => value.check, { confirmation: null });
        if (found) {
          set({ ringScores: found.rings });
        }
        return found !== null;
      },
      setUpEnigma: async () => {
        const key = get().check?.key;
        if (!key) {
          return false;
        }
        return apply(api.setUpMachine({ reflector: key.reflector, rotors: key.wheelOrder.split(' '), rings: key.rings, plugs: key.plugs, positions: key.messageKey }));
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
      openHut8Notebook: () => windows.openHut8Notebook(),
      openInstructions: () => windows.openInstructions(),
      showMode: (mode) => windows.showMode(mode),
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
      setUpMachine: (key) => apply(api.setUpMachine(key)),
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

/** Provides the machine store, which follows machine states, Bombe calls and key sheets changed by other windows. */
export function MachineStoreProvider({ api, children }: { api: EnigmaApi; children: ReactNode }) {
  const [store] = useState(() => createMachineStore(api));
  useEffect(() => api.windows.onMachineState((machine) => store.setState({ machine })), [api, store]);
  useEffect(() => api.windows.onBombeResult((result) => store.getState().receiveBombe(result)), [api, store]);
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
