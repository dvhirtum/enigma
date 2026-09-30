import { drumLetters } from './MenuView';
import { parseLink, type Link } from './menuLayout';

export const rotors = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'] as const;

/** A wheel order in 20 minutes, as on a real Bombe, in positions per second. */
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

/** Every wheel order of three different rotors from `chosen`, in the catalogue order, written as "II V III". */
export function wheelOrdersOf(chosen: readonly string[]): string[] {
  const picked = rotors.filter((rotor) => chosen.includes(rotor));
  return picked.flatMap((upper) =>
    picked.flatMap((middle) => picked.flatMap((lower) => (new Set([upper, middle, lower]).size === 3 ? [`${upper} ${middle} ${lower}`] : []))),
  );
}

/** The rotors the wheel orders use. */
export function rotorsOf(wheelOrders: readonly string[]): string[] {
  const used = new Set(wheelOrders.flatMap((order) => order.split(' ')));
  return rotors.filter((rotor) => used.has(rotor));
}

/** Turns each drum of `position` on by its letter of the offset, without carrying (1 = ZZA turns the lower drum one on). */
export function advance(position: string, offset: number): string {
  const steps = drumLetters(offset);
  return [...position]
    .map((letter, drum) => String.fromCharCode(65 + ((letter.charCodeAt(0) - 65 + ((steps.charCodeAt(drum) - 64) % 26)) % 26)))
    .join('');
}

/** How many letters each Bombe drum is ahead of its Enigma rotor. */
export const drumLetterOffsets: Record<string, number> = { I: 1, II: 1, III: 1, IV: 2, V: 3, VI: 1, VII: 1, VIII: 1 };

/** The letters the drums of a wheel order show at core positions. */
export function drumLettersOf(core: string, wheelOrder: string): string {
  const offsets = wheelOrder.split(' ').map((rotor) => drumLetterOffsets[rotor]);
  return [...core].map((letter, drum) => String.fromCharCode(65 + ((letter.charCodeAt(0) - 65 + offsets[drum]) % 26))).join('');
}

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
