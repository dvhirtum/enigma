import type { BombeMachine } from '../api';
import { parseLink, type Link } from './menuLayout';

/** The drum letters of an offset: its digits in base 26, with Z as 0 and A as 1 (1 = ZZA, 26 = ZAZ). */
export function drumLetters(offset: number): string {
  return [Math.floor(offset / 676), Math.floor(offset / 26), offset].map((digit) => String.fromCharCode(65 + ((digit + 25) % 26))).join('');
}

export const rotors = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;

/** A run without stops in 10.4 minutes, as on a real Bombe, in positions per second. */
export const historicalSpeed = 17_576 / (10.4 * 60);

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
  return [...position].map((letter, drum) => String.fromCharCode(65 + ((letter.charCodeAt(0) - 65 + ((start.charCodeAt(drum) - 64) % 26)) % 26))).join('');
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
  return `${rounded} positions/s`;
}

/** The chains joined into one Bombe each: chain n is joined to the one before when `joins[n - 1]`. */
export function groupsOf(machine: BombeMachine): number[][] {
  return machine.chains.reduce<number[][]>((groups, _, chain) => {
    if (chain > 0 && machine.joins[chain - 1]) {
      groups[groups.length - 1].push(chain);
    } else {
      groups.push([chain]);
    }
    return groups;
  }, []);
}

/** "Chain 1" or "Chains 1–2". */
export function chainNames(chains: readonly number[]): string {
  return chains.length === 1 ? `Chain ${chains[0] + 1}` : `Chains ${chains[0] + 1}–${chains[chains.length - 1] + 1}`;
}

/** The rotor in each row of a chain (upper, middle, lower), or null where the row has no drums. */
export function rowsOf(machine: BombeMachine, chain: number): (string | null)[] {
  return [0, 1, 2].map((row) => machine.chains[chain].scramblers.map((scrambler) => scrambler.drums[row]).find(Boolean) ?? null);
}

/** The live wires of a test register as 26 letters, a dot for each dead wire. */
export function wiresOf(liveWires: string): string {
  return [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter) => (liveWires.includes(letter) ? letter : '·')).join('');
}
