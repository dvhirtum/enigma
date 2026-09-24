export const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Lamp and key rows of the German keyboard. */
export const keyboardRows = ['QWERTZUIO', 'ASDFGHJK', 'PYXCVBNML'];

export const models = ['M3', 'M4'] as const;

export const reflectors: Record<string, string[]> = {
  M3: ['B', 'C'],
  M4: ['B-thin', 'C-thin'],
};

export const slots: Record<string, string[]> = {
  M3: ['Left', 'Middle', 'Right'],
  M4: ['Greek', 'Left', 'Middle', 'Right'],
};

export const greekRotors = ['Beta', 'Gamma'];

/** The letter `steps` places after `letter`, wrapping from Z to A. */
export function shiftLetter(letter: string, steps: number): string {
  const index = alphabet.indexOf(letter);
  return alphabet[(((index + steps) % 26) + 26) % 26];
}

/** The ring setting `steps` places after `ringSetting`, wrapping from 26 to 1. */
export function shiftRing(ringSetting: number, steps: number): number {
  return ((((ringSetting - 1 + steps) % 26) + 26) % 26) + 1;
}

/** The letter of the ring setting 1–26. */
export function ringLetter(ringSetting: number): string {
  return alphabet[ringSetting - 1];
}
