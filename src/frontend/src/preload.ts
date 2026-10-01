import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BackendStatus, BombeResult, EnigmaApi, MachineState } from './api';

type Mode = 'enigma' | 'bombe';

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
    clearLamps: () => invoke('machine:clearLamps'),
    applyDailyKey: (sheetId, day) => invoke('machine:applyDailyKey', sheetId, day),
    setUpMachine: (key) => invoke('machine:setUpMachine', key),
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
    messageTypes: () => invoke('bombe:messageTypes'),
    suggestCrib: (type) => invoke('bombe:suggestCrib', type),
    getSolution: () => invoke('bombe:getSolution'),
    loadIntercept: (id) => invoke('bombe:loadIntercept', id),
    generateExercise: () => invoke('bombe:generateExercise'),
    pasteCipherText: (text) => invoke('bombe:pasteCipherText', text),
    setCrib: (crib) => invoke('bombe:setCrib', crib),
    placeCrib: (position) => invoke('bombe:placeCrib', position),
    setMenu: (links, testRegister) => invoke('bombe:setMenu', links, testRegister),
    buildMenu: () => invoke('bombe:buildMenu'),
    configure: (settings) => invoke('bombe:configure', settings),
    plugUpMenu: () => invoke('bombe:plugUpMenu'),
    plugJack: (chain, scrambler, jack, letter) => invoke('bombe:plugJack', chain, scrambler, jack, letter),
    fitRow: (chain, row, upTo, rotor) => invoke('bombe:fitRow', chain, row, upTo, rotor),
    removeDrum: (chain, scrambler, row) => invoke('bombe:removeDrum', chain, scrambler, row),
    turnScrambler: (chain, scrambler, start) => invoke('bombe:turnScrambler', chain, scrambler, start),
    setTestRegister: (chain, change) => invoke('bombe:setTestRegister', chain, change),
    joinChains: (join, joined) => invoke('bombe:joinChains', join, joined),
    startRun: (speed) => invoke('bombe:startRun', speed),
    setRunSpeed: (speed) => invoke('bombe:setRunSpeed', speed),
    continueRun: () => invoke('bombe:continueRun'),
    cancelRun: () => invoke('bombe:cancelRun'),
    getRun: () => invoke('bombe:getRun'),
    getStops: (from, count) => invoke('bombe:getStops', from, count),
    clearStops: () => invoke('bombe:clearStops'),
    getPrintout: (from, count) => invoke('bombe:getPrintout', from, count),
    clearPrintout: () => invoke('bombe:clearPrintout'),
    setChecker: (change) => invoke('bombe:setChecker', change),
    pressCheckerKey: (key) => invoke('bombe:pressCheckerKey', key),
    setUpChecker: (stop) => invoke('bombe:setUpChecker', stop),
    getCheck: (stop) => invoke('bombe:getCheck', stop),
    setCheck: (stop, change) => invoke('bombe:setCheck', stop, change),
    confirmCheck: (stop, verdict) => invoke('bombe:confirmCheck', stop, verdict),
    suggestSteckers: (stop) => invoke('bombe:suggestSteckers', stop),
    findRightRing: (stop) => invoke('bombe:findRightRing', stop),
    findMiddleRing: (stop) => invoke('bombe:findMiddleRing', stop),
    takePinch: (sheetId, day) => invoke('bombe:takePinch', sheetId, day),
    writeIndicator: (message, change) => invoke('bombe:writeIndicator', message, change),
    fillInIndicator: (message) => invoke('bombe:fillInIndicator', message),
    getRingTable: (stop) => invoke('bombe:getRingTable', stop),
    readRings: (stop, left, middle) => invoke('bombe:readRings', stop, left, middle),
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
    openHut8Notebook: () => invoke('windows:openHut8Notebook'),
    openInstructions: () => invoke('windows:openInstructions'),
    showMode: (mode) => invoke('windows:showMode', mode),
    onShowMode: (listener) => {
      const handler = (_event: IpcRendererEvent, mode: Mode) => listener(mode);
      ipcRenderer.on('windows:mode', handler);
      return () => ipcRenderer.removeListener('windows:mode', handler);
    },
    onMachineState: (listener) => {
      const handler = (_event: IpcRendererEvent, state: MachineState) => listener(state);
      ipcRenderer.on('machine:state', handler);
      return () => ipcRenderer.removeListener('machine:state', handler);
    },
    releaseCheckerKey: () => invoke('windows:releaseCheckerKey'),
    onCheckerKeyReleased: (listener) => {
      const handler = () => listener();
      ipcRenderer.on('windows:checkerKeyReleased', handler);
      return () => ipcRenderer.removeListener('windows:checkerKeyReleased', handler);
    },
    onBombeResult: (listener) => {
      const handler = (_event: IpcRendererEvent, result: BombeResult) => listener(result);
      ipcRenderer.on('bombe:result', handler);
      return () => ipcRenderer.removeListener('bombe:result', handler);
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
