import type { BombeState } from '../api';
import { drumLetters } from './MenuView';
import { parseLink, type Link } from './menuLayout';

export const rotors = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;

/** A run in 20 minutes, as on a real Bombe, in positions per second. */
export const historicalSpeed = 17_576 / (20 * 60);

/** The colours of the Bombe drums, by rotor. */
export const drumColours: Record<string, string> = {
  I: '#b3261e',
  II: '#6d1f2c',
  III: '#2e7d32',
  IV: '#e0b000',
  V: '#6d4c2f',
  VI: '#1f4fa3',
  VII: '#1a1a1a',
  VIII: '#b8bcc2',
};

/** Turns each drum of `position` on by its letter of the offset, without carrying (1 = ZZA turns the lower drum one on). */
export function advance(position: string, offset: number): string {
  return advanceBy(position, drumLetters(offset));
}

/** Turns each drum of `position` on by its letter of `start` (Z = 0, A = 1), without carrying: a scrambler set to `start`. */
export function advanceBy(position: string, start: string): string {
  return [...position]
    .map((letter, drum) => String.fromCharCode(65 + ((letter.charCodeAt(0) - 65 + ((start.charCodeAt(drum) - 64) % 26)) % 26)))
    .join('');
}

/** A menu link on a scrambler of the machine: its copy, its index in the menu links, its slot (0–35) and start letters. */
export interface ScramblerSlot extends Link {
  copy: number;
  scrambler: number;
  slot: number;
  start: string;
}

/**
 * The scramblers of each copy of the menu: copy `k` takes the chains from `k × chainsPerCopy`, its links in offset
 * order along them, 12 to a chain.
 */
export function slotsOf(bombe: BombeState): ScramblerSlot[] {
  const { menu, machine } = bombe;
  if (!menu || !machine) {
    return [];
  }
  const links = menu.links.map((id, scrambler) => ({ ...parseLink(id), scrambler })).sort((a, b) => a.offset - b.offset);
  return machine.copies.flatMap((copy, index) =>
    links.map((link, order) => ({ ...link, copy: index, slot: index * machine.chainsPerCopy * chainLength + order, start: copy.starts[link.scrambler] })),
  );
}

/** The scramblers of a chain (a bank of 12). */
export const chainLength = 12;

/** The indicator drum reading of drum letters: the letters reversed (A ↔ Z). */
export function indicatorOf(position: string): string {
  return [...position].map((letter) => String.fromCharCode(155 - letter.charCodeAt(0))).join('');
}

/** The menu links in the order they are plugged into the scramblers: by offset. */
export function scramblersOf(links: readonly string[]): Link[] {
  return links.map(parseLink).sort((a, b) => a.offset - b.offset);
}

/** The top of the speed slider: full speed. Below it, the speed rises tenfold every `decade` steps from historical. */
export const fullSpeedStep = 40;
const decade = 13;

/** The speed of a slider step, in positions per second, or null for full speed. */
export function speedAt(step: number): number | null {
  return step >= fullSpeedStep ? null : historicalSpeed * 10 ** (step / decade);
}

/** The slider step closest to a speed. */
export function stepOf(speed: number | null): number {
  return speed === null ? fullSpeedStep : Math.min(fullSpeedStep - 1, Math.max(0, Math.round(decade * Math.log10(speed / historicalSpeed))));
}

export function formatSpeed(speed: number | null): string {
  if (speed === null) {
    return 'Full speed';
  }
  const rounded = speed < 100 ? speed.toFixed(1) : Math.round(speed).toLocaleString('en-US');
  return `${rounded} positions/s${stepOf(speed) === 0 ? ' (historical)' : ''}`;
}
