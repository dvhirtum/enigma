import type { MachineApi } from './api';

export interface Route {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  body?: unknown;
}

type MachineRoutes = { [K in keyof MachineApi]: (...args: Parameters<MachineApi[K]>) => Route };

const machine = '/api/machine';
const segment = encodeURIComponent;

export const healthRoute: Route = { method: 'GET', path: '/api/health' };

export const machineRoutes: MachineRoutes = {
  getState: () => ({ method: 'GET', path: machine }),
  create: (model) => ({ method: 'POST', path: machine, body: { model } }),
  insertRotors: (rotors) => ({ method: 'PUT', path: `${machine}/rotors`, body: { rotors } }),
  removeRotors: () => ({ method: 'DELETE', path: `${machine}/rotors` }),
  turnRotor: (slot, position) => ({ method: 'PUT', path: `${machine}/rotors/${segment(slot)}/position`, body: { position } }),
  setRingSetting: (rotor, ringSetting) => ({ method: 'PUT', path: `${machine}/rotor-box/${segment(rotor)}/ring`, body: { ringSetting } }),
  setReflector: (reflector) => ({ method: 'PUT', path: `${machine}/reflector`, body: { reflector } }),
  connectPlug: (pair) => ({ method: 'POST', path: `${machine}/plugs`, body: { pair } }),
  disconnectPlug: (letter) => ({ method: 'DELETE', path: `${machine}/plugs/${segment(letter)}` }),
  pressKey: (key) => ({ method: 'POST', path: `${machine}/keyboard/press`, body: { key } }),
  releaseKey: () => ({ method: 'POST', path: `${machine}/keyboard/release` }),
};
