import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type { BackendStatus, EnigmaApi } from './api';

const invoke = <T>(channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args) as Promise<T>;

const api: EnigmaApi = {
  health: () => invoke('api:health'),
  machine: {
    getState: () => invoke('machine:getState'),
    create: (model) => invoke('machine:create', model),
    insertRotors: (rotors) => invoke('machine:insertRotors', rotors),
    removeRotors: () => invoke('machine:removeRotors'),
    turnRotor: (slot, position) => invoke('machine:turnRotor', slot, position),
    setRingSetting: (rotor, ringSetting) => invoke('machine:setRingSetting', rotor, ringSetting),
    setReflector: (reflector) => invoke('machine:setReflector', reflector),
    connectPlug: (pair) => invoke('machine:connectPlug', pair),
    disconnectPlug: (letter) => invoke('machine:disconnectPlug', letter),
    movePlug: (from, to) => invoke('machine:movePlug', from, to),
    pressKey: (key) => invoke('machine:pressKey', key),
    releaseKey: () => invoke('machine:releaseKey'),
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
