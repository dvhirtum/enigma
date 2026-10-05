import { describe, expect, it } from 'vitest';
import type { KeySheetFile } from './api';
import { keySheetDocument, offizierDocument, procedureDocument, stabDocument, stichwortDocument, wetterDocument } from './printSheet';
import { fakeBook, fakeOffizier, fakeStab, fakeStichwoerter, fakeTables, fakeWetterTafeln, fakeWetterkurzschluessel, generatedSheet } from './test/fakeApi';

const file: KeySheetFile = { network: 'Triton', month: '1944-06', days: generatedSheet.days, kenngruppenbuch: fakeBook, tauschtafeln: fakeTables };

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');
const render = (sheet: KeySheetFile = file, model = 'M4') => parse(keySheetDocument(sheet, model));
const renderProcedure = (sheet: KeySheetFile = file) => parse(procedureDocument(sheet)!);

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

  it('holds only the Schlüsseltafel', () => {
    const doc = render();

    const sections = doc.querySelectorAll('section');

    expect(sections).toHaveLength(1);
    expect(doc.querySelector('table.allot')).toBeNull();
  });

  it('escapes text from the sheet', () => {
    const doc = render({ ...file, network: '<b>Nord</b>' });

    const lead = doc.querySelector('.lead');

    expect(lead?.textContent).toContain('<B>NORD</B>');
    expect(doc.querySelector('.lead b b')).toBeNull();
  });
});

describe('Kenngruppenbuch and Tauschtafeln document', () => {
  it('lists every allotment in the Zuteilungsliste without marking a network', () => {
    const doc = renderProcedure();

    const allotments = rows(doc.querySelector('table.allot')!);

    expect(allotments).toEqual([
      ['Verfahrenkenngruppen', '1–100'],
      ['Triton', '101–120'],
      ['Hydra', '121–140'],
    ]);
    expect(doc.querySelector('.own')).toBeNull();
    expect(doc.body.textContent).not.toContain('Schlüsseltafel');
  });

  it('prints every column of the book in bands of 20, labelled with their use', () => {
    const doc = renderProcedure();

    const triton = band(doc, 'Spalten 101–120 · Triton');
    const last = band(doc, 'Spalten 661–676 · frei');

    expect(doc.querySelectorAll('.band-title')).toHaveLength(34 + 26);
    expect(band(doc, 'Spalten 1–20 · Verfahrenkenngruppen')).toBeDefined();
    expect(rows(triton!.querySelector('table')!)[0]?.slice(0, 3)).toEqual(['01', 'DWA', 'DXA']);
    expect(rows(last!.querySelector('table')!)[25]?.slice(16)).toEqual(['ZZZ', '', '', '', '']);
  });

  it('gives the column of every Kenngruppe in the Suchtafel', () => {
    const doc = renderProcedure();

    const block = band(doc, 'Kenngruppen D..');
    const dw = rows(block!.querySelector('table')!).find(([label]) => label === 'DW');

    expect(dw?.[1]).toBe('101');
    expect(dw?.[26]).toBe('101');
  });

  it('prints the calendar and every Tauschtafel as a grid of partners', () => {
    const doc = renderProcedure();

    const calendar = rows(doc.querySelectorAll('table.allot')[1]);
    const first = doc.querySelector('table.swaps')!;
    const [a] = rows(first);

    expect(calendar[5]).toEqual(['Juni', '2', '3']);
    expect(doc.querySelectorAll('table.swaps')).toHaveLength(9);
    expect(a?.slice(0, 4)).toEqual(['A', 'ZZ', 'ZY', 'AQ']);
    expect(rows(first).find(([label]) => label === 'Z')?.[26]).toBe('AA');
    expect(doc.body.textContent).toContain('Gültig 1.–15. Januar, 16.–Ende Mai, 1.–15. Oktober');
  });

  it('is the same for every network and month', () => {
    const triton = procedureDocument(file);

    const hydra = procedureDocument({ ...file, network: 'Hydra', month: '1944-11' });

    expect(hydra).toBe(triton);
  });

  it('is null when the file has no book and no tables', () => {
    const html = procedureDocument({ network: 'Triton', month: '1944-06', days: generatedSheet.days });

    expect(html).toBeNull();
  });
});

describe('Offizier and Stab documents', () => {
  const officerFile: KeySheetFile = { ...file, offizier: fakeOffizier, stab: fakeStab };

  it('lists the Offizier days without a Grundstellung and names every setting', () => {
    const doc = parse(offizierDocument(officerFile, 'M4')!);

    expect(doc.querySelector('h1')?.textContent).toBe('Offizier-Schlüssel M4');
    expect(rows(doc.querySelector('.keys')!)).toEqual([['01', 'B dünn', 'Beta V VI VIII', '01 02 03 04', 'QW ER']]);
    const settings = [...doc.querySelectorAll('.halves table')].flatMap(rows);
    expect(settings).toHaveLength(26);
    expect(settings[1]).toEqual(['B', 'Bruno', 'CDEF']);
    expect(settings[25]).toEqual(['Z', 'Zeppelin', 'ABCD']);
  });

  it('prints the Stab key with its own inner setting', () => {
    const doc = parse(stabDocument(officerFile, 'M4')!);

    expect(doc.querySelector('h1')?.textContent).toBe('Stab-Schlüssel M4');
    expect(rows(doc.querySelector('.keys')!)).toEqual([['01', 'C dünn', 'Gamma I II VII', '05 06 07 08', 'TZ']]);
  });

  it('restricts the Offizier key to officers and the Stab key to authorised persons', () => {
    const offizier = parse(offizierDocument(officerFile, 'M4')!);
    const stab = parse(stabDocument(officerFile, 'M4')!);

    expect(offizier.querySelector('.lead')?.textContent).toContain('Nur für Offiziere.');
    expect(stab.querySelector('.lead')?.textContent).toContain('Nur für Befugte.');
    expect(stab.querySelector('.lead')?.textContent).not.toContain('Offiziere');
  });

  it('is null when the file has no officer keys', () => {
    expect(offizierDocument(file, 'M4')).toBeNull();
    expect(stabDocument(file, 'M4')).toBeNull();
  });
});

describe('Stichwort document', () => {
  it('prints the rule and one envelope per Stichwort', () => {
    const doc = parse(stichwortDocument({ ...file, stichwoerter: fakeStichwoerter })!);

    expect(doc.querySelector('h1')?.textContent).toBe('Stichwortbefehle 1944');
    const envelopes = [...doc.querySelectorAll('.envelope')];
    expect(envelopes.map((e) => e.querySelector('.band-title')?.textContent)).toEqual(['Umschlag PERSEUS', 'Umschlag ORION']);
    expect(envelopes[0]?.querySelector('.word')?.textContent).toBe('DANZIG');
    expect(doc.body.textContent).toContain('Blindbuchstabe');
  });

  it('is null when the file has no Stichwort set', () => {
    expect(stichwortDocument(file)).toBeNull();
  });
});

describe('Wetterkurzschlüssel document', () => {
  it('prints the letter order, the tables and every setting table of the year', () => {
    const doc = parse(wetterDocument({ ...file, wetterTafeln: fakeWetterTafeln }, fakeWetterkurzschluessel)!);

    const order = rows(doc.querySelector('.allot')!);
    expect(order[5]).toEqual(['6.', 'Tafel 8', '']);
    expect(order[8]).toEqual(['9.', 'Tafel 9', 'Richtung und Art der Dünung']);
    expect(order[9]).toEqual(['10.–11.', '', 'Kennung des Bootes']);
    const swell = band(doc, 'Tafel 9 · Richtung und Art der Dünung *')!;
    expect(rows(swell.querySelector('table')!)).toEqual([
      ['N', 'A', 'I', 'Q'],
      ['keine Dünung', 'Y'],
    ]);
    expect(doc.body.textContent).toContain('Gültig vom 1.1.1944 bis 31.12.1944');
    const settings = rows([...doc.querySelectorAll('table.weather')].at(-1)!);
    expect(settings[0]).toEqual(['A', 'ABC', 'BCD', 'CDE', 'DEF']);
    expect(settings).toHaveLength(26);
  });

  it('is null when the file has no weather tables', () => {
    expect(wetterDocument(file, fakeWetterkurzschluessel)).toBeNull();
  });
});
