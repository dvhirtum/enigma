import type { EnigmaApi } from './api';

declare global {
  interface Window {
    enigma: EnigmaApi;
  }
}
