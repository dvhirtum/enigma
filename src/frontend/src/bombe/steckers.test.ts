import { describe, expect, it } from 'vitest';
import { pairsOf, partnersOf, withPartner } from './steckers';

describe('steckers', () => {
  it('reads each letter of a pair as the partner of the other', () => {
    expect(partnersOf('AD RR')).toEqual({ A: 'D', D: 'A', R: 'R' });
  });

  it('writes pairs lower letter first in alphabetical order', () => {
    expect(pairsOf({ T: 'E', E: 'T', A: 'D', D: 'A', R: 'R' })).toBe('AD ET RR');
  });

  it('adds a pair', () => {
    expect(withPartner('GQ', 'D', 'A')).toBe('AD GQ');
  });

  it('marks a letter unsteckered when paired with itself', () => {
    expect(withPartner('GQ', 'R', 'R')).toBe('GQ RR');
  });

  it('removes the pairs both letters had before', () => {
    expect(withPartner('AD ET GQ', 'A', 'E')).toBe('AE GQ');
  });

  it('makes a letter and its partner unknown when cleared', () => {
    expect(withPartner('AD GQ', 'D', null)).toBe('GQ');
  });
});
