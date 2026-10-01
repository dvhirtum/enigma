import { describe, expect, it } from 'vitest';
import { carterMachine, emptyMachine } from '../test/fakeApi';
import { advance, advanceBy, chainNames, formatSpeed, fullSpeedStep, groupsOf, historicalSpeed, indicatorOf, rowsOf, scramblersOf, speedAt, stepOf, wiresOf } from './drums';

describe('drums', () => {
  it('turns each drum on by its letter of the offset, without carrying', () => {
    expect(advance('ZZZ', 1)).toBe('ZZA');
    expect(advance('ZZZ', 26)).toBe('ZAZ');
    expect(advance('VMB', 16)).toBe('VMR');
    expect(advance('AAZ', 27)).toBe('ABA');
  });

  it('reads the indicator drums with the letters reversed', () => {
    // Carter's true stop: drum letters WPC read DKX on the indicator drums.
    expect(indicatorOf('WPC')).toBe('DKX');
    expect(indicatorOf('ZZZ')).toBe('AAA');
  });

  it('turns each drum on by its letter of the start letters, Z counting as nought', () => {
    expect(advanceBy('ZZZ', 'ZZF')).toBe('ZZF');
    expect(advanceBy('WPC', 'ZZA')).toBe('WPD');
    expect(advanceBy('WPC', 'ABZ')).toBe('XRC');
  });

  it('groups the chains joined to the one before', () => {
    expect(groupsOf(carterMachine())).toEqual([[0, 1], [2]]);
    expect(groupsOf(emptyMachine())).toEqual([[0], [1], [2]]);
    expect(chainNames([0, 1])).toBe('Chains 1–2');
    expect(chainNames([2])).toBe('Chain 3');
  });

  it('reads the rotor of each row of a chain', () => {
    expect(rowsOf(carterMachine(), 1)).toEqual(['II', 'V', 'III']);
    expect(rowsOf(carterMachine(), 2)).toEqual([null, null, null]);
  });

  it('writes the dead wires of a test register as dots', () => {
    expect(wiresOf('Q')).toBe('················Q·········');
    expect(wiresOf('ABCDEFGHIJKLMNOPRSTUVWXYZ')).toBe('ABCDEFGHIJKLMNOP·RSTUVWXYZ');
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
    expect(formatSpeed(historicalSpeed)).toBe('28.2 positions/s');
    expect(formatSpeed(null)).toBe('Full speed');
    expect(formatSpeed(14_646)).toBe('14,646 positions/s');
  });
});
