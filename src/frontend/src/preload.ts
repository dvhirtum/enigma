import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BackendStatus, EnigmaApi, MachineState } from './api';

const invoke = <T>(channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: EnigmaApi = {
  health: () => invoke('api:health'),
  machine: {
    getState: () => invoke('machine:getState'),
    create: (model) => invoke('machine:create', model),
    insertRotor: (slot, rotor) => invoke('machine:insertRotor', slot, rotor),
    removeRotor: (slot) => invoke('machine:removeRotor', slot),
    turnRotor: (slot, position) => invoke('machine:turnRotor', slot, position),
    setRingSetting: (rotor, ringSetting) => invoke('machine:setRingSetting', rotor, ringSetting),
    setReflector: (reflector) => invoke('machine:setReflector', reflector),
    connectPlug: (pair) => invoke('machine:connectPlug', pair),
    disconnectPlug: (letter) => invoke('machine:disconnectPlug', letter),
    movePlug: (from, to) => invoke('machine:movePlug', from, to),
    pressKey: (key) => invoke('machine:pressKey', key),
    releaseKey: () => invoke('machine:releaseKey'),
    applyDailyKey: (sheetId, day) => invoke('machine:applyDailyKey', sheetId, day),
    startSending: () => invoke('machine:startSending'),
    startReceiving: (message, sheetId, day) => invoke('machine:startReceiving', message, sheetId, day),
    chooseGroups: (schluesselkenngruppe, verfahrenkenngruppe, fillers) =>
      invoke('machine:chooseGroups', schluesselkenngruppe, verfahrenkenngruppe, fillers),
    finishMessage: () => invoke('machine:finishMessage'),
    cancelOperator: () => invoke('machine:cancelOperator'),
  },
  keySheets: {
    list: () => invoke('keySheets:list'),
    get: (id) => invoke('keySheets:get', id),
    remove: (id) => invoke('keySheets:remove', id),
    generate: (model, year) => invoke('keySheets:generate', model, year),
    import: (file) => invoke('keySheets:import', file),
    export: (id) => invoke('keySheets:export', id),
  },
  procedure: {
    getBook: (id) => invoke('procedure:getBook', id),
    findReceivingKeys: (message, date) => invoke('procedure:findReceivingKeys', message, date),
  },
  bombe: {
    getState: () => invoke('bombe:getState'),
    intercepts: () => invoke('bombe:intercepts'),
    loadIntercept: (id) => invoke('bombe:loadIntercept', id),
    generateExercise: () => invoke('bombe:generateExercise'),
    pasteCipherText: (text) => invoke('bombe:pasteCipherText', text),
    setCrib: (crib) => invoke('bombe:setCrib', crib),
    placeCrib: (position) => invoke('bombe:placeCrib', position),
    setMenu: (links, testRegister) => invoke('bombe:setMenu', links, testRegister),
    buildMenu: () => invoke('bombe:buildMenu'),
    configure: (settings) => invoke('bombe:configure', settings),
    startRun: (speed) => invoke('bombe:startRun', speed),
    setRunSpeed: (speed) => invoke('bombe:setRunSpeed', speed),
    continueRun: () => invoke('bombe:continueRun'),
    cancelRun: () => invoke('bombe:cancelRun'),
    getRun: () => invoke('bombe:getRun'),
  },
  clipboard: {
    writeText: (text) => invoke('clipboard:writeText', text),
  },
  files: {
    openKeySheet: () => invoke('files:openKeySheet'),
    saveKeySheet: (name, content) => invoke('files:saveKeySheet', name, content),
    printKeySheet: (name, html) => invoke('files:printKeySheet', name, html),
    printToFolder: (documents) => invoke('files:printToFolder', documents),
  },
  windows: {
    openNotebook: () => invoke('windows:openNotebook'),
    openInstructions: () => invoke('windows:openInstructions'),
    onMachineState: (listener) => {
      const handler = (_event: IpcRendererEvent, state: MachineState) => listener(state);
      ipcRenderer.on('machine:state', handler);
      return () => ipcRenderer.removeListener('machine:state', handler);
    },
    onKeySheetsChanged: (listener) => {
      const handler = () => listener();
      ipcRenderer.on('keySheets:changed', handler);
      return () => ipcRenderer.removeListener('keySheets:changed', handler);
    },
  },
  backend: {
    status: () => invoke('backend:status'),
    onStatus: (listener) => {
      const handler = (_event: IpcRendererEvent, status: BackendStatus) => listener(status);
      ipcRenderer.on('backend:status', handler);
      return () => ipcRenderer.removeListener('backend:status', handler);
    },
    restart: () => invoke('backend:restart'),
  },
};

contextBridge.exposeInMainWorld('enigma', api);
