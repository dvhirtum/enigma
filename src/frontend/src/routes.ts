import type { BombeApi, KeySheetApi, MachineApi, ProcedureApi } from './api';

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
}

type Routes<Api> = { [K in keyof Api]: Api[K] extends (...args: infer Args) => unknown ? (...args: Args) => Route : never };

const machine = '/api/machine';
const keySheets = '/api/keysheets';
const operator = '/api/operator';
const bombe = '/api/bombe';
const segment = encodeURIComponent;

export const healthRoute: Route = { method: 'GET', path: '/api/health' };

export const machineRoutes: Routes<MachineApi> = {
  getState: () => ({ method: 'GET', path: machine }),
  create: (model) => ({ method: 'POST', path: machine, body: { model } }),
  insertRotor: (slot, rotor) => ({ method: 'PUT', path: `${machine}/rotors/${segment(slot)}`, body: { rotor } }),
  removeRotor: (slot) => ({ method: 'DELETE', path: `${machine}/rotors/${segment(slot)}` }),
  turnRotor: (slot, position) => ({ method: 'PUT', path: `${machine}/rotors/${segment(slot)}/position`, body: { position } }),
  setRingSetting: (rotor, ringSetting) => ({ method: 'PUT', path: `${machine}/rotor-box/${segment(rotor)}/ring`, body: { ringSetting } }),
  setReflector: (reflector) => ({ method: 'PUT', path: `${machine}/reflector`, body: { reflector } }),
  connectPlug: (pair) => ({ method: 'POST', path: `${machine}/plugs`, body: { pair } }),
  disconnectPlug: (letter) => ({ method: 'DELETE', path: `${machine}/plugs/${segment(letter)}` }),
  movePlug: (from, to) => ({ method: 'PUT', path: `${machine}/plugs/${segment(from)}`, body: { to } }),
  pressKey: (key) => ({ method: 'POST', path: `${machine}/keyboard/press`, body: { key } }),
  releaseKey: () => ({ method: 'POST', path: `${machine}/keyboard/release` }),
  applyDailyKey: (sheetId, day) => ({ method: 'POST', path: `${machine}/daily-key`, body: { sheetId, day } }),
  setUpMachine: (key) => ({ method: 'PUT', path: `${machine}/key`, body: key }),
  startSending: () => ({ method: 'POST', path: `${operator}/send` }),
  startReceiving: (message, sheetId, day) => ({ method: 'POST', path: `${operator}/receive`, body: { message, sheetId, day } }),
  chooseGroups: (schluesselkenngruppe, verfahrenkenngruppe, fillers) => ({
    method: 'PUT',
    path: `${operator}/groups`,
    body: { schluesselkenngruppe, verfahrenkenngruppe, fillers },
  }),
  finishMessage: () => ({ method: 'POST', path: `${operator}/finish` }),
  cancelOperator: () => ({ method: 'DELETE', path: operator }),
};

export const procedureRoutes: Routes<ProcedureApi> = {
  getBook: (id) => ({ method: 'GET', path: `/api/kenngruppenbuecher/${segment(id)}` }),
  findReceivingKeys: (message, date) => ({ method: 'POST', path: `${operator}/receiving-keys`, body: { message, date } }),
};

export const keySheetRoutes: Routes<KeySheetApi> = {
  list: () => ({ method: 'GET', path: keySheets }),
  get: (id) => ({ method: 'GET', path: `${keySheets}/${segment(id)}` }),
  remove: (id) => ({ method: 'DELETE', path: `${keySheets}/${segment(id)}` }),
  generate: (model, year) => ({ method: 'POST', path: `${keySheets}/generate`, body: { model, year } }),
  import: (file) => ({ method: 'POST', path: `${keySheets}/import`, body: file }),
  export: (id) => ({ method: 'GET', path: `${keySheets}/${segment(id)}/export` }),
};

export const bombeRoutes: Routes<BombeApi> = {
  getState: () => ({ method: 'GET', path: bombe }),
  intercepts: () => ({ method: 'GET', path: `${bombe}/intercepts` }),
  loadIntercept: (id) => ({ method: 'POST', path: `${bombe}/source/intercept`, body: { id } }),
  generateExercise: () => ({ method: 'POST', path: `${bombe}/source/exercise` }),
  pasteCipherText: (text) => ({ method: 'PUT', path: `${bombe}/cipher-text`, body: { text } }),
  setCrib: (crib) => ({ method: 'PUT', path: `${bombe}/crib`, body: { crib } }),
  placeCrib: (position) => ({ method: 'PUT', path: `${bombe}/placement`, body: { position } }),
  setMenu: (links, testRegister) => ({ method: 'PUT', path: `${bombe}/menu`, body: { links, testRegister } }),
  buildMenu: () => ({ method: 'POST', path: `${bombe}/menu/build` }),
  configure: (settings) => ({ method: 'PUT', path: `${bombe}/settings`, body: settings }),
  startRun: (speed) => ({ method: 'POST', path: `${bombe}/run`, body: { speed } }),
  setRunSpeed: (speed) => ({ method: 'PUT', path: `${bombe}/run/speed`, body: { speed } }),
  continueRun: () => ({ method: 'POST', path: `${bombe}/run/continue` }),
  cancelRun: () => ({ method: 'DELETE', path: `${bombe}/run` }),
  getRun: () => ({ method: 'GET', path: `${bombe}/run` }),
  getStops: (from, count) => ({ method: 'GET', path: `${bombe}/run/stops?from=${from}&count=${count}` }),
  getCheck: (stop) => ({ method: 'GET', path: `${bombe}/run/stops/${stop}/check` }),
  setCheck: (stop, change) => ({ method: 'PUT', path: `${bombe}/run/stops/${stop}/check`, body: change }),
  pressCheckKey: (stop, key) => ({ method: 'POST', path: `${bombe}/run/stops/${stop}/check/press`, body: { key } }),
  confirmCheck: (stop, verdict) => ({ method: 'POST', path: `${bombe}/run/stops/${stop}/check/verdict`, body: { verdict } }),
  suggestSteckers: (stop) => ({ method: 'POST', path: `${bombe}/run/stops/${stop}/check/suggest` }),
  findRightRing: (stop) => ({ method: 'POST', path: `${bombe}/run/stops/${stop}/check/find` }),
};
