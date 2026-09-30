import { describe, expect, it } from 'vitest';
import { carterMenu } from '../test/fakeApi';
import { advance, advanceBy, formatSpeed, fullSpeedStep, historicalSpeed, indicatorOf, scramblersOf, slotsOf, speedAt, stepOf } from './drums';

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

  it('puts each copy of the menu on its own chains, the links by offset', () => {
    const twoChains = slotsOf(carterMenu);
    expect(twoChains).toHaveLength(13);
    expect(twoChains.map((slot) => slot.slot)).toEqual([...Array(13).keys()]);

    const oneChain = {
      ...carterMenu,
      menu: { ...carterMenu.menu!, links: ['NE2', 'SW1'] },
      machine: { chainsPerCopy: 1, copies: [0, 1, 2].map(() => ({ drums: [null, null, null], starts: ['ZZB', 'ZZA'] })) },
    };
    const slots = slotsOf(oneChain);
    expect(slots.map((slot) => slot.slot)).toEqual([0, 1, 12, 13, 24, 25]);
    expect(slots[0]).toMatchObject({ id: 'SW1', copy: 0, scrambler: 1, start: 'ZZA' });
    expect(slots[5]).toMatchObject({ id: 'NE2', copy: 2, scrambler: 0, start: 'ZZB' });
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
