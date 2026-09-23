import { contextBridge, ipcRenderer } from 'electron';
import type { EnigmaApi, Health } from './api';

const api: EnigmaApi = {
  health: () => ipcRenderer.invoke('api:health') as Promise<Health>,
};

contextBridge.exposeInMainWorld('enigma', api);
