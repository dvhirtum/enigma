import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BackendStatus, EnigmaApi } from './api';

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
    create: (network, month, text) => invoke('keySheets:create', network, month, text),
    update: (id, network, month, text) => invoke('keySheets:update', id, network, month, text),
    remove: (id) => invoke('keySheets:remove', id),
    generate: (model, network, month) => invoke('keySheets:generate', model, network, month),
    import: (file) => invoke('keySheets:import', file),
    export: (id) => invoke('keySheets:export', id),
  },
  procedure: {
    getBook: (id) => invoke('procedure:getBook', id),
    getTables: (id) => invoke('procedure:getTables', id),
    findReceivingKeys: (message, date) => invoke('procedure:findReceivingKeys', message, date),
  },
  clipboard: {
    writeText: (text) => invoke('clipboard:writeText', text),
  },
  files: {
    openKeySheet: () => invoke('files:openKeySheet'),
    saveKeySheet: (name, content) => invoke('files:saveKeySheet', name, content),
    printKeySheet: (name, html) => invoke('files:printKeySheet', name, html),
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
