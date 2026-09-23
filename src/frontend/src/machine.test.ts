import { describe, expect, it } from 'vitest';
import { ringLetter, shiftLetter } from './machine';

describe('shiftLetter', () => {
  it('moves forward and back through the alphabet', () => {
    expect(shiftLetter('A', 1)).toBe('B');
    expect(shiftLetter('M', -1)).toBe('L');
  });

  it('wraps around between Z and A', () => {
    expect(shiftLetter('Z', 1)).toBe('A');
    expect(shiftLetter('A', -1)).toBe('Z');
  });
});

describe('ringLetter', () => {
  it('maps ring settings 1–26 to A–Z', () => {
    expect(ringLetter(1)).toBe('A');
    expect(ringLetter(26)).toBe('Z');
  });
});
