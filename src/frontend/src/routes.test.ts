import { describe, expect, it } from 'vitest';
import { keySheetRoutes, machineRoutes } from './routes';

describe('machine routes', () => {
  it.each([
    ['getState', machineRoutes.getState(), 'GET', '/api/machine', undefined],
    ['create', machineRoutes.create('M4'), 'POST', '/api/machine', { model: 'M4' }],
    ['insertRotor', machineRoutes.insertRotor('Left', 'IV'), 'PUT', '/api/machine/rotors/Left', { rotor: 'IV' }],
    ['removeRotor', machineRoutes.removeRotor('Middle'), 'DELETE', '/api/machine/rotors/Middle', undefined],
    ['turnRotor', machineRoutes.turnRotor('Greek', 'Q'), 'PUT', '/api/machine/rotors/Greek/position', { position: 'Q' }],
    ['setRingSetting', machineRoutes.setRingSetting('IV', 21), 'PUT', '/api/machine/rotor-box/IV/ring', { ringSetting: 21 }],
    ['setReflector', machineRoutes.setReflector('C'), 'PUT', '/api/machine/reflector', { reflector: 'C' }],
    ['connectPlug', machineRoutes.connectPlug('AV'), 'POST', '/api/machine/plugs', { pair: 'AV' }],
    ['disconnectPlug', machineRoutes.disconnectPlug('A'), 'DELETE', '/api/machine/plugs/A', undefined],
    ['movePlug', machineRoutes.movePlug('A', 'C'), 'PUT', '/api/machine/plugs/A', { to: 'C' }],
    ['pressKey', machineRoutes.pressKey('Q'), 'POST', '/api/machine/keyboard/press', { key: 'Q' }],
    ['releaseKey', machineRoutes.releaseKey(), 'POST', '/api/machine/keyboard/release', undefined],
    ['applyDailyKey', machineRoutes.applyDailyKey('g1', 19), 'POST', '/api/machine/daily-key', { sheetId: 'g1', day: 19 }],
  ])('maps %s to its endpoint', (_name, route, method, path, body) => {
    expect(route).toEqual({ method, path, ...(body && { body }) });
  });

  it('encodes path segments', () => {
    expect(machineRoutes.setRingSetting('../x', 1).path).toBe('/api/machine/rotor-box/..%2Fx/ring');
  });
});

describe('key sheet routes', () => {
  const file = { network: 'Hydra', month: '1943-12', days: [] };

  it.each([
    ['list', keySheetRoutes.list(), 'GET', '/api/keysheets', undefined],
    ['get', keySheetRoutes.get('g1'), 'GET', '/api/keysheets/g1', undefined],
    ['create', keySheetRoutes.create('Triton', '1944-06', '1 B I II III'), 'POST', '/api/keysheets', { network: 'Triton', month: '1944-06', text: '1 B I II III' }],
    ['update', keySheetRoutes.update('g1', 'Triton', '1944-06', ''), 'PUT', '/api/keysheets/g1', { network: 'Triton', month: '1944-06', text: '' }],
    ['remove', keySheetRoutes.remove('g1'), 'DELETE', '/api/keysheets/g1', undefined],
    ['generate', keySheetRoutes.generate('M4', 'Triton', '1944-06'), 'POST', '/api/keysheets/generate', { model: 'M4', network: 'Triton', month: '1944-06' }],
    ['import', keySheetRoutes.import(file), 'POST', '/api/keysheets/import', file],
  ])('maps %s to its endpoint', (_name, route, method, path, body) => {
    expect(route).toEqual({ method, path, ...(body && { body }) });
  });

  it('encodes the sheet id', () => {
    expect(keySheetRoutes.get('../x').path).toBe('/api/keysheets/..%2Fx');
  });
});
