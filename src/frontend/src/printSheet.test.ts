import { describe, expect, it } from 'vitest';
import type { KeySheetFile } from './api';
import { keySheetDocument } from './printSheet';
import { fakeBook, fakeTables, generatedSheet } from './test/fakeApi';

const file: KeySheetFile = { network: 'Triton', month: '1944-06', days: generatedSheet.days, kenngruppenbuch: fakeBook, tauschtafeln: fakeTables };

function render(sheet: KeySheetFile = file, model = 'M4'): Document {
  return new DOMParser().parseFromString(keySheetDocument(sheet, model), 'text/html');
}

const rows = (table: Element) => [...table.querySelectorAll('tbody tr')].map((row) => [...row.children].map((cell) => cell.textContent));
const band = (doc: Document, title: string) => [...doc.querySelectorAll('.band')].find((b) => b.querySelector('.band-title')?.textContent === title);

describe('key sheet document', () => {
  it('lists the daily keys with the last day first', () => {
    const doc = render();

    const keys = rows(doc.querySelector('table.keys')!);

    expect(doc.querySelector('h1')?.textContent).toBe('Marine-Schlüssel M4');
    expect(doc.querySelector('.lead')?.textContent).toBe('Schlüsseltafel für das Schlüsselnetz TRITON, Monat Juni 1944');
    expect(keys).toEqual([
      ['02', 'B dünn', 'Beta II IV I', '01 01 01 22', 'CO', ''],
      ['01', 'B dünn', 'Beta II IV I', '01 01 01 22', 'AT BL DF', 'QRSA'],
    ]);
  });

  it('marks the network of the sheet in the Zuteilungsliste', () => {
    const doc = render();

    const allotments = rows(doc.querySelector('table.allot')!);
    const own = doc.querySelector('table.allot tr.own td')?.textContent;

    expect(allotments).toEqual([
      ['Verfahrenkenngruppen', '1–100'],
      ['Triton', '101–120'],
      ['Hydra', '121–140'],
    ]);
    expect(own).toBe('Triton');
  });

  it('prints every column of the book in bands of 20, labelled with their use', () => {
    const doc = render();

    const triton = band(doc, 'Spalten 101–120 · Triton');
    const last = band(doc, 'Spalten 661–676 · frei');

    expect(doc.querySelectorAll('.band-title')).toHaveLength(34 + 26);
    expect(band(doc, 'Spalten 1–20 · Verfahrenkenngruppen')).toBeDefined();
    expect(rows(triton!.querySelector('table')!)[0]?.slice(0, 3)).toEqual(['01', 'DWA', 'DXA']);
    expect(rows(last!.querySelector('table')!)[25]?.slice(16)).toEqual(['ZZZ', '', '', '', '']);
  });

  it('gives the column of every Kenngruppe in the Suchtafel', () => {
    const doc = render();

    const block = band(doc, 'Kenngruppen D..');
    const dw = rows(block!.querySelector('table')!).find(([label]) => label === 'DW');

    expect(dw?.[1]).toBe('101');
    expect(dw?.[26]).toBe('101');
  });

  it('prints the calendar and every Tauschtafel as a grid of partners', () => {
    const doc = render();

    const calendar = rows(doc.querySelectorAll('table.allot')[1]);
    const first = doc.querySelector('table.swaps')!;
    const [a] = rows(first);

    expect(calendar[5]).toEqual(['Juni', '2', '3']);
    expect(doc.querySelectorAll('table.swaps')).toHaveLength(9);
    expect(a?.slice(0, 4)).toEqual(['A', 'ZZ', 'ZY', 'AQ']);
    expect(rows(first).find(([label]) => label === 'Z')?.[26]).toBe('AA');
    expect(doc.body.textContent).toContain('Gültig 1.–15. Januar, 16.–Ende Mai, 1.–15. Oktober');
  });

  it('leaves out the book and tables when the file has none', () => {
    const doc = render({ network: 'Triton', month: '1944-06', days: generatedSheet.days });

    const sections = doc.querySelectorAll('section');

    expect(sections).toHaveLength(1);
  });

  it('escapes text from the sheet', () => {
    const doc = render({ ...file, network: '<b>Nord</b>' });

    const lead = doc.querySelector('.lead');

    expect(lead?.textContent).toContain('<B>NORD</B>');
    expect(doc.querySelector('.lead b b')).toBeNull();
  });
});
