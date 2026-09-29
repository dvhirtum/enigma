import { describe, expect, it } from 'vitest';
import { layoutMenu, lettersOf, parseLink } from './menuLayout';

const carter = ['SW1', 'NE2', 'MT3', 'KT4', 'GE5', 'GR6', 'SV7', 'TO8', 'ZR9', 'ZH10', 'UE11', 'GR12', 'AS13', 'RA14', 'LG15', 'VE16'].map(parseLink);

describe('menu layout', () => {
  it('reads a link as two letters and an offset', () => {
    expect(parseLink('ZH10')).toEqual({ id: 'ZH10', first: 'Z', second: 'H', offset: 10 });
  });

  it('lists the letters A to Z, once each', () => {
    expect(lettersOf(carter).join('')).toBe('AEGHKLMNORSTUVWZ');
  });

  it('places every letter inside the margins', () => {
    const at = layoutMenu(carter, 640, 440, 30);

    expect(Object.keys(at).sort()).toEqual(lettersOf(carter));
    for (const { x, y } of Object.values(at)) {
      expect(x).toBeGreaterThanOrEqual(30);
      expect(x).toBeLessThanOrEqual(610);
      expect(y).toBeGreaterThanOrEqual(30);
      expect(y).toBeLessThanOrEqual(410);
    }
  });

  it('keeps the letters apart', () => {
    const points = Object.values(layoutMenu(carter, 640, 440, 30));

    const closest = Math.min(...points.flatMap((a, i) => points.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    expect(closest).toBeGreaterThan(40);
  });

  it('gives the same picture for the same links', () => {
    expect(layoutMenu(carter, 640, 440, 30)).toEqual(layoutMenu(carter, 640, 440, 30));
  });
});
