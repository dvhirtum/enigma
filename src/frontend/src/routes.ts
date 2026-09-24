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
};
