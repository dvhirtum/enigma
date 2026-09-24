import { describe, expect, it } from 'vitest';
import { machineRoutes } from './routes';

describe('machine routes', () => {
  it.each([
    ['getState', machineRoutes.getState(), 'GET', '/api/machine', undefined],
    ['create', machineRoutes.create('M4'), 'POST', '/api/machine', { model: 'M4' }],
    ['insertRotors', machineRoutes.insertRotors(['II', 'IV', 'V']), 'PUT', '/api/machine/rotors', { rotors: ['II', 'IV', 'V'] }],
    ['removeRotors', machineRoutes.removeRotors(), 'DELETE', '/api/machine/rotors', undefined],
    ['turnRotor', machineRoutes.turnRotor('Greek', 'Q'), 'PUT', '/api/machine/rotors/Greek/position', { position: 'Q' }],
    ['setRingSetting', machineRoutes.setRingSetting('IV', 21), 'PUT', '/api/machine/rotor-box/IV/ring', { ringSetting: 21 }],
    ['setReflector', machineRoutes.setReflector('C'), 'PUT', '/api/machine/reflector', { reflector: 'C' }],
    ['connectPlug', machineRoutes.connectPlug('AV'), 'POST', '/api/machine/plugs', { pair: 'AV' }],
    ['disconnectPlug', machineRoutes.disconnectPlug('A'), 'DELETE', '/api/machine/plugs/A', undefined],
    ['movePlug', machineRoutes.movePlug('A', 'C'), 'PUT', '/api/machine/plugs/A', { to: 'C' }],
    ['pressKey', machineRoutes.pressKey('Q'), 'POST', '/api/machine/keyboard/press', { key: 'Q' }],
    ['releaseKey', machineRoutes.releaseKey(), 'POST', '/api/machine/keyboard/release', undefined],
  ])('maps %s to its endpoint', (_name, route, method, path, body) => {
    expect(route).toEqual({ method, path, ...(body && { body }) });
  });

  it('encodes path segments', () => {
    expect(machineRoutes.setRingSetting('../x', 1).path).toBe('/api/machine/rotor-box/..%2Fx/ring');
  });
});
