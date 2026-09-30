import { describe, expect, it } from 'vitest';
import { bombeRoutes, keySheetRoutes, machineRoutes, procedureRoutes } from './routes';

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
    ['startSending', machineRoutes.startSending(), 'POST', '/api/operator/send', undefined],
    ['startReceiving', machineRoutes.startReceiving('QWER', 'g1', 19), 'POST', '/api/operator/receive', { message: 'QWER', sheetId: 'g1', day: 19 }],
    [
      'chooseGroups',
      machineRoutes.chooseGroups('DWA', 'AAB', 'QX'),
      'PUT',
      '/api/operator/groups',
      { schluesselkenngruppe: 'DWA', verfahrenkenngruppe: 'AAB', fillers: 'QX' },
    ],
    ['finishMessage', machineRoutes.finishMessage(), 'POST', '/api/operator/finish', undefined],
    ['cancelOperator', machineRoutes.cancelOperator(), 'DELETE', '/api/operator', undefined],
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
    ['remove', keySheetRoutes.remove('g1'), 'DELETE', '/api/keysheets/g1', undefined],
    ['generate', keySheetRoutes.generate('M4', 1944), 'POST', '/api/keysheets/generate', { model: 'M4', year: 1944 }],
    ['import', keySheetRoutes.import(file), 'POST', '/api/keysheets/import', file],
    ['export', keySheetRoutes.export('g1'), 'GET', '/api/keysheets/g1/export', undefined],
  ])('maps %s to its endpoint', (_name, route, method, path, body) => {
    expect(route).toEqual({ method, path, ...(body && { body }) });
  });

  it('encodes the sheet id', () => {
    expect(keySheetRoutes.get('../x').path).toBe('/api/keysheets/..%2Fx');
  });
});

describe('procedure routes', () => {
  it('maps the book and the receiving keys to their endpoints', () => {
    expect(procedureRoutes.getBook('b/1')).toEqual({ method: 'GET', path: '/api/kenngruppenbuecher/b%2F1' });
    expect(procedureRoutes.findReceivingKeys('QWER', '1944-06-19')).toEqual({
      method: 'POST',
      path: '/api/operator/receiving-keys',
      body: { message: 'QWER', date: '1944-06-19' },
    });
  });
});

describe('bombe routes', () => {
  it.each([
    ['getState', bombeRoutes.getState(), 'GET', '/api/bombe', undefined],
    ['intercepts', bombeRoutes.intercepts(), 'GET', '/api/bombe/intercepts', undefined],
    ['loadIntercept', bombeRoutes.loadIntercept('carter'), 'POST', '/api/bombe/source/intercept', { id: 'carter' }],
    ['generateExercise', bombeRoutes.generateExercise(), 'POST', '/api/bombe/source/exercise', undefined],
    ['pasteCipherText', bombeRoutes.pasteCipherText('QWER'), 'PUT', '/api/bombe/cipher-text', { text: 'QWER' }],
    ['setCrib', bombeRoutes.setCrib('WETTER'), 'PUT', '/api/bombe/crib', { crib: 'WETTER' }],
    ['placeCrib', bombeRoutes.placeCrib(0), 'PUT', '/api/bombe/placement', { position: 0 }],
    ['setMenu', bombeRoutes.setMenu(['SW1', 'NE2'], 'E'), 'PUT', '/api/bombe/menu', { links: ['SW1', 'NE2'], testRegister: 'E' }],
    ['buildMenu', bombeRoutes.buildMenu(), 'POST', '/api/bombe/menu/build', undefined],
    ['configure', bombeRoutes.configure({ reflector: 'C' }), 'PUT', '/api/bombe/settings', { reflector: 'C' }],
    ['plugUpMenu', bombeRoutes.plugUpMenu(), 'POST', '/api/bombe/machine/plug-up', undefined],
    ['plugJack', bombeRoutes.plugJack(2, 11, 1, 'K'), 'PUT', '/api/bombe/machine/chains/2/scramblers/11/jacks/1', { letter: 'K' }],
    ['plugJack out', bombeRoutes.plugJack(0, 0, 0, null), 'PUT', '/api/bombe/machine/chains/0/scramblers/0/jacks/0', { letter: '' }],
    ['fitRow', bombeRoutes.fitRow(1, 2, 8, 'IV'), 'PUT', '/api/bombe/machine/chains/1/rows/2', { rotor: 'IV', upTo: 8 }],
    ['removeDrum', bombeRoutes.removeDrum(0, 3, 1), 'DELETE', '/api/bombe/machine/chains/0/scramblers/3/drums/1', undefined],
    ['turnScrambler', bombeRoutes.turnScrambler(0, 2, 'ZZF'), 'PUT', '/api/bombe/machine/chains/0/scramblers/2/start', { start: 'ZZF' }],
    ['setTestRegister', bombeRoutes.setTestRegister(1, { letter: 'G' }), 'PUT', '/api/bombe/machine/chains/1/test-register', { letter: 'G' }],
    ['joinChains', bombeRoutes.joinChains(0, true), 'PUT', '/api/bombe/machine/joins/0', { joined: true }],
    ['startRun', bombeRoutes.startRun(null), 'POST', '/api/bombe/run', { speed: null, notebook: false }],
    ['startRun for the notebook', bombeRoutes.startRun(14.6, true), 'POST', '/api/bombe/run', { speed: 14.6, notebook: true }],
    ['getPrintout', bombeRoutes.getPrintout(100, 100), 'GET', '/api/bombe/printout?from=100&count=100', undefined],
    ['clearPrintout', bombeRoutes.clearPrintout(), 'DELETE', '/api/bombe/printout', undefined],
    ['setChecker', bombeRoutes.setChecker({ drums: ['I', null, 'III'] }), 'PUT', '/api/bombe/checking', { drums: ['I', null, 'III'] }],
    ['pressCheckerKey', bombeRoutes.pressCheckerKey('Q'), 'POST', '/api/bombe/checking/press', { key: 'Q' }],
    ['setUpChecker', bombeRoutes.setUpChecker(4), 'POST', '/api/bombe/stops/4/checking', undefined],
    ['setRunSpeed', bombeRoutes.setRunSpeed(14.6), 'PUT', '/api/bombe/run/speed', { speed: 14.6 }],
    ['continueRun', bombeRoutes.continueRun(), 'POST', '/api/bombe/run/continue', undefined],
    ['cancelRun', bombeRoutes.cancelRun(), 'DELETE', '/api/bombe/run', undefined],
    ['getRun', bombeRoutes.getRun(), 'GET', '/api/bombe/run', undefined],
  ])('maps %s to its endpoint', (_name, route, method, path, body) => {
    expect(route).toEqual({ method, path, ...(body && { body }) });
  });
});
