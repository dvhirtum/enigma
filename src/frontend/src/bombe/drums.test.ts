import { describe, expect, it } from 'vitest';
import { advance, formatSpeed, fullSpeedStep, historicalSpeed, indicatorOf, rotorsOf, scramblersOf, speedAt, stepOf, wheelOrdersOf } from './drums';

describe('drums', () => {
  it('lists every wheel order of the chosen rotors', () => {
    expect(wheelOrdersOf(rotorsOf(['II V III']))).toEqual(['II III V', 'II V III', 'III II V', 'III V II', 'V II III', 'V III II']);
    expect(wheelOrdersOf(['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'])).toHaveLength(336);
    expect(wheelOrdersOf(['I', 'II'])).toEqual([]);
  });

  it('turns each drum on by its letter of the offset, without carrying', () => {
    expect(advance('ZZZ', 1)).toBe('ZZA');
    expect(advance('ZZZ', 26)).toBe('ZAZ');
    expect(advance('VMB', 16)).toBe('VMR');
    expect(advance('AAZ', 27)).toBe('ABA');
  });

  it('reads the indicator drums with the letters reversed', () => {
    // Carter's true stop: core positions VMB read ENY on the indicator drums.
    expect(indicatorOf('VMB')).toBe('ENY');
    expect(indicatorOf('ZZZ')).toBe('AAA');
  });

  it('plugs the links into the scramblers by offset', () => {
    expect(scramblersOf(['GR12', 'SW1', 'NE2']).map((link) => link.id)).toEqual(['SW1', 'NE2', 'GR12']);
  });

  it('runs the speed slider from historical to full speed', () => {
    expect(speedAt(0)).toBeCloseTo(historicalSpeed);
    expect(speedAt(fullSpeedStep - 1)).toBeCloseTo(historicalSpeed * 1000);
    expect(speedAt(fullSpeedStep)).toBeNull();
    expect(stepOf(speedAt(20))).toBe(20);
    expect(stepOf(null)).toBe(fullSpeedStep);
    expect(formatSpeed(historicalSpeed)).toBe('14.6 positions/s (historical)');
    expect(formatSpeed(null)).toBe('Full speed');
    expect(formatSpeed(14_646)).toBe('14,646 positions/s');
  });
});
