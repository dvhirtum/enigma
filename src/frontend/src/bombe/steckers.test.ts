import { describe, expect, it } from 'vitest';
import { contradictionsOf, partnersOf, withPartner, withoutLetter } from './steckers';

describe('steckers', () => {
  it('reads each letter of a pair as a partner of the other', () => {
    expect(partnersOf('AD RR')).toEqual({ A: ['D'], D: ['A'], R: ['R'] });
  });

  it('keeps every partner written for a letter', () => {
    expect(partnersOf('AD EP EX')).toMatchObject({ E: ['P', 'X'], P: ['E'], X: ['E'] });
  });

  it('marks a letter with two partners and its partners as contradicted', () => {
    expect([...contradictionsOf('AD EP EX RR')].sort()).toEqual(['E', 'P', 'X']);
    expect(contradictionsOf('AD RR').size).toBe(0);
  });

  it('rubs out every pair of a letter', () => {
    expect(withoutLetter('AD EP EX RR', 'E')).toBe('AD RR');
  });

  it('writes a pair in place of every pair either letter had', () => {
    expect(withPartner('AD EP EX RR', 'E', 'A')).toBe('AE RR');
    expect(withPartner('AD RR', 'R', 'R')).toBe('AD RR');
  });

  it('rubs out a letter written without a partner', () => {
    expect(withPartner('AD EP RR', 'E', null)).toBe('AD RR');
  });
});
