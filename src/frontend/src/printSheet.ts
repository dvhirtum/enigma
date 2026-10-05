import courierPrimeBold from '../assets/fonts/CourierPrime-Bold.ttf?inline';
import courierPrime from '../assets/fonts/CourierPrime-Regular.ttf?inline';
import specialElite from '../assets/fonts/SpecialElite-Regular.ttf?inline';
import type { DailyKey, Kenngruppenbuch, KeySheetFile, OfficerKey, TauschtafelSet, WetterTafelSet, Wetterkurzschluessel } from './api';

const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const months = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const reflectorNames: Record<string, string> = { 'B-thin': 'B dünn', 'C-thin': 'C dünn' };
/** Columns per band of the Spaltentafel; each network is allotted exactly one band. */
const bandWidth = 20;

const escape = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pad = (value: number, width: number) => String(value).padStart(width, '0');

/** Typed text with uneven ink: each letter gets a slightly different density and baseline. */
function inked(text: string): string {
  const densities = [1, 0.84, 0.95, 0.76, 1, 0.9, 0.97, 0.81];
  const offsets = [0, 0.4, -0.3, 0, 0.2, -0.4, 0.3, 0];
  return [...text]
    .map((c, i) => {
      if (c === ' ') {
        return ' ';
      }
      const k = (i * 7 + c.charCodeAt(0)) % densities.length;
      return `<span style="opacity:${densities[k]};top:${offsets[(k + i) % offsets.length]}px">${escape(c)}</span>`;
    })
    .join('');
}

const heading = (level: 1 | 2, text: string) => `<h${level}>${inked(text)}</h${level}>`;
const monthName = (month: string) => `${months[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;
const halfMonth = (index: number) => `${index % 2 === 0 ? '1.–15.' : '16.–Ende'} ${months[Math.floor(index / 2)]}`;

function keyRow(key: DailyKey): string {
  const cells = [
    pad(key.day, 2),
    reflectorNames[key.reflector] ?? key.reflector,
    key.rotors.join(' '),
    key.rings.map((ring) => pad(ring, 2)).join(' '),
    key.plugs.join(' '),
    key.grundstellung ?? '',
  ];
  return `<tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`;
}

function keyTable(file: KeySheetFile, model: string): string {
  const days = [...file.days].sort((a, b) => b.day - a.day);
  return `<section class="page">
  <div class="stamp">Geheim!</div>
  ${heading(1, `Marine-Schlüssel ${model}`)}
  <p class="lead">Schlüsseltafel für das Schlüsselnetz <b>${escape(file.network.toUpperCase())}</b>, Monat ${escape(monthName(file.month))}</p>
  <table class="keys">
    <thead><tr><th>Datum</th><th>Umkehr&shy;walze</th><th>Walzenlage</th><th>Ring&shy;stellung</th><th>Steckerverbindungen</th><th>Grund&shy;stellung</th></tr></thead>
    <tbody>${days.map(keyRow).join('')}</tbody>
  </table>
  <p class="note">Tagesschlüssel gelten von 0000 Uhr bis 2400 Uhr. Verbrauchte Tage abschneiden und vernichten.</p>
</section>`;
}

function allotments(book: Kenngruppenbuch): string {
  const rows = [
    { name: 'Verfahrenkenngruppen', ...book.verfahrenkenngruppen },
    ...book.allotments.map((a) => ({ name: a.network, first: a.first, last: a.last })),
  ];
  return `<section class="page">
  ${heading(1, 'Kenngruppenbuch')}
  <p class="lead">Ausgabe ${escape(book.created.slice(0, 10))}</p>
  ${heading(2, 'Zuteilungsliste')}
  <table class="allot">
    <thead><tr><th>Verwendung</th><th>Spalten</th></tr></thead>
    <tbody>${rows.map((r) => `<tr><td>${escape(r.name)}</td><td>${r.first}–${r.last}</td></tr>`).join('')}</tbody>
  </table>
  <p class="note">Teil A, die Spaltentafel, gibt die Kenngruppen jeder Spalte. Teil B, die Suchtafel, gibt zu jeder Kenngruppe ihre Spalte:
  im Block des ersten Buchstabens, in der Zeile des zweiten und der Spalte des dritten.</p>
</section>`;
}

function bandLabel(book: Kenngruppenbuch, first: number): string {
  if (first <= book.verfahrenkenngruppen.last) {
    return 'Verfahrenkenngruppen';
  }
  return book.allotments.find((a) => a.first === first)?.network ?? 'frei';
}

function columnTables(book: Kenngruppenbuch): string {
  const columns = book.columns.map((column) => column.split(' '));
  const bands: string[] = [];
  for (let first = 1; first <= columns.length; first += bandWidth) {
    // The last band is padded with empty columns, so every band has the same widths.
    const numbers = Array.from({ length: bandWidth }, (_, i) => first + i);
    const last = Math.min(first + bandWidth - 1, columns.length);
    const rows = Array.from(
      { length: 26 },
      (_, row) => `<tr><th>${pad(row + 1, 2)}</th>${numbers.map((n) => `<td>${escape(columns[n - 1]?.[row] ?? '')}</td>`).join('')}</tr>`,
    );
    bands.push(`<div class="band">
    <p class="band-title">Spalten ${first}–${last} · ${escape(bandLabel(book, first))}</p>
    <table class="grid"><thead><tr><th></th>${numbers.map((n) => `<th>${n <= last ? n : ''}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
  </div>`);
  }
  return `<section class="page">${heading(2, 'Teil A · Spaltentafel')}${bands.join('')}</section>`;
}

function searchTables(book: Kenngruppenbuch): string {
  const column = new Map<string, number>();
  book.columns.forEach((trigrams, index) => trigrams.split(' ').forEach((trigram) => column.set(trigram, index + 1)));
  const header = `<tr><th></th>${[...alphabet].map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const blocks = [...alphabet].map((first) => {
    const rows = [...alphabet].map(
      (second) => `<tr><th>${first}${second}</th>${[...alphabet].map((third) => `<td>${column.get(first + second + third) ?? ''}</td>`).join('')}</tr>`,
    );
    return `<div class="band">
    <p class="band-title">Kenngruppen ${first}..</p>
    <table class="grid search"><thead>${header}</thead><tbody>${rows.join('')}</tbody></table>
  </div>`;
  });
  return `<section class="page">${heading(2, 'Teil B · Suchtafel')}${blocks.join('')}</section>`;
}

function calendar(tables: TauschtafelSet): string {
  const rows = months.map((name, m) => {
    const cells = [tables.calendar[m * 2], tables.calendar[m * 2 + 1]].map((n) => `<td>${n ?? ''}</td>`).join('');
    return `<tr><td>${name}</td>${cells}</tr>`;
  });
  return `<section class="page">
  ${heading(1, `Doppelbuchstabentauschtafeln ${tables.year}`)}
  ${heading(2, 'Tafelkalender')}
  <table class="allot">
    <thead><tr><th>Monat</th><th>1.–15.</th><th>16.–Ende</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>
  <p class="note">Jede Tafel tauscht Buchstabenpaare in beiden Richtungen. Das Paar in der Zeile seines ersten und der Spalte seines zweiten Buchstabens
  aufsuchen und durch das dort stehende Paar ersetzen.</p>
</section>`;
}

function swapTable(tables: TauschtafelSet, table: TauschtafelSet['tables'][number]): string {
  const partner = new Map<string, string>();
  for (const swap of table.swaps) {
    partner.set(swap.slice(0, 2), swap.slice(2, 4));
    partner.set(swap.slice(2, 4), swap.slice(0, 2));
  }
  const used = tables.calendar.flatMap((n, index) => (n === table.number ? [halfMonth(index)] : []));
  const header = `<tr><th></th>${[...alphabet].map((c) => `<th>${c}</th>`).join('')}</tr>`;
  const rows = [...alphabet].map(
    (first) => `<tr><th>${first}</th>${[...alphabet].map((second) => `<td>${partner.get(first + second) ?? ''}</td>`).join('')}</tr>`,
  );
  return `<section class="page">
  ${heading(2, `Tafel ${table.number}`)}
  <p class="lead">Gültig ${escape(used.join(', ') || '–')}</p>
  <table class="grid swaps"><thead>${header}</thead><tbody>${rows.join('')}</tbody></table>
</section>`;
}

const styles = `
@font-face { font-family: 'Special Elite'; src: url(${specialElite}); }
@font-face { font-family: 'Courier Prime'; src: url(${courierPrime}); }
@font-face { font-family: 'Courier Prime'; font-weight: bold; src: url(${courierPrimeBold}); }
@page {
  size: A4;
  background: #f1e8d2;
  margin: 14mm 13mm 16mm;
  @bottom-center { content: '- ' counter(page) ' -'; font: 9pt 'Courier Prime', monospace; color: #3b342c; }
}
:root { --ink: #231f1b; --faint: #6d6252; --stamp: #a3261d; }
html {
  background: #f1e8d2;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body { margin: 0; color: var(--ink); font: 9pt/1.3 'Courier Prime', monospace; }
.page { break-before: page; position: relative; }
.page:first-child { break-before: auto; }
h1, h2 { font-family: 'Special Elite', monospace; font-weight: normal; letter-spacing: 0.08em; margin: 0 0 3mm; }
h1 { font-size: 17pt; text-transform: uppercase; }
h2 { font-size: 12pt; }
h1 span, h2 span { position: relative; }
h2::after { content: '------------------------------'; display: block; font: 9pt 'Courier Prime', monospace; color: var(--faint); letter-spacing: 0; }
.lead { margin: 0 0 5mm; font-size: 10pt; }
.note { margin-top: 5mm; max-width: 150mm; color: #3b342c; }
.stamp {
  position: absolute; top: 1mm; right: 4mm; padding: 1mm 4mm;
  font: 18pt 'Special Elite', monospace; color: var(--stamp); border: 0.7mm solid var(--stamp);
  transform: rotate(-6deg); opacity: 0.8; text-transform: uppercase; letter-spacing: 0.1em;
}
table { border-collapse: collapse; }
th { font-weight: bold; text-align: left; }
.keys { width: 100%; font-size: 10pt; }
.keys th { border-bottom: 0.3mm dashed var(--ink); padding: 1mm 2mm; vertical-align: bottom; font-size: 8.5pt; }
.keys td { padding: 1.05mm 2mm; border-bottom: 0.2mm dotted var(--faint); white-space: nowrap; }
.allot { font-size: 10pt; min-width: 110mm; }
.allot th, .allot td { padding: 0.8mm 4mm 0.8mm 0; border-bottom: 0.2mm dotted var(--faint); }
.band { break-inside: avoid; margin-bottom: 6mm; }
.band-title { margin: 0 0 1mm; font-weight: bold; }
.grid { width: 100%; table-layout: fixed; font-size: 8pt; line-height: 1.2; }
.grid th { text-align: center; color: var(--faint); font-size: 7pt; }
.grid tbody th { text-align: right; padding-right: 1.5mm; width: 6mm; }
.grid thead th { border-bottom: 0.2mm dashed var(--faint); }
.grid td { text-align: center; }
.grid tbody tr:nth-child(5n) td { border-bottom: 0.2mm dotted var(--faint); }
.grid :is(td, th):nth-child(5n + 7) { border-left: 0.2mm dotted var(--faint); }
.search tbody th { width: 7mm; }
.swaps { font-size: 11pt; line-height: 2.05; }
.swaps th { font-size: 8.5pt; }
.halves { display: flex; gap: 10mm; }
.envelopes { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.envelope { break-inside: avoid; border: 0.3mm dashed var(--ink); padding: 3mm 4mm; }
.envelope p { margin: 0 0 2mm; }
.envelope .word { font: 16pt 'Special Elite', monospace; letter-spacing: 0.2em; }
.weather th, .weather td { padding-right: 4mm; }
`;

function page(title: string, parts: string[]): string {
  return `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; font-src data:">
<title>${escape(title)}</title>
<style>${styles}</style>
</head>
<body>
${parts.join('\n')}
</body>
</html>
`;
}

/** The printable Schlüsseltafel, with the last day first. Text looks typed on a period typewriter. */
export function keySheetDocument(file: KeySheetFile, model: string): string {
  return page(`${file.network} ${file.month}`, [keyTable(file, model)]);
}

/**
 * The printable Kenngruppenbuch with its Spaltentafel and Suchtafel, and the Doppelbuchstabentauschtafeln with their
 * calendar. Null when the file has neither.
 */
export function procedureDocument(file: KeySheetFile): string | null {
  const parts: string[] = [];
  if (file.kenngruppenbuch) {
    parts.push(allotments(file.kenngruppenbuch), columnTables(file.kenngruppenbuch), searchTables(file.kenngruppenbuch));
  }
  if (file.tauschtafeln) {
    const tables = file.tauschtafeln;
    parts.push(calendar(tables), ...[...tables.tables].sort((a, b) => a.number - b.number).map((table) => swapTable(tables, table)));
  }
  return parts.length > 0 ? page(procedureName(file), parts) : null;
}

/** The name of the procedure document, such as Kenngruppenbuch-Tauschtafeln-1944. */
export function procedureName(file: KeySheetFile): string {
  return `Kenngruppenbuch-Tauschtafeln-${file.tauschtafeln?.year ?? file.month.slice(0, 4)}`;
}

/** The German spelling alphabet, which names an officer setting: OFFIZIER BRUNO. */
const spelling = [
  'Anton',
  'Bruno',
  'Cäsar',
  'Dora',
  'Emil',
  'Friedrich',
  'Gustav',
  'Heinrich',
  'Ida',
  'Julius',
  'Konrad',
  'Ludwig',
  'Martha',
  'Nordpol',
  'Otto',
  'Paula',
  'Quelle',
  'Richard',
  'Siegfried',
  'Toni',
  'Ulrich',
  'Viktor',
  'Wilhelm',
  'Xanthippe',
  'Ypsilon',
  'Zeppelin',
];
const periods = ['0000–0559', '0600–1159', '1200–1759', '1800–2359'];
const germanDate = (date: string) => `${Number(date.slice(8, 10))}.${Number(date.slice(5, 7))}.${date.slice(0, 4)}`;

function officerKeyRow(key: DailyKey): string {
  const cells = [
    pad(key.day, 2),
    reflectorNames[key.reflector] ?? key.reflector,
    key.rotors.join(' '),
    key.rings.map((ring) => pad(ring, 2)).join(' '),
    key.plugs.join(' '),
  ];
  return `<tr>${cells.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`;
}

function settingTable(settings: string[]): string {
  const head = '<thead><tr><th>Buchstabe</th><th>Name</th><th>Einstellung</th></tr></thead>';
  const rows = settings.map((setting, i) => `<tr><td>${alphabet[i]}</td><td>${escape(spelling[i] ?? '')}</td><td>${escape(setting)}</td></tr>`);
  return `<div class="halves">
  <table class="allot">${head}<tbody>${rows.slice(0, 13).join('')}</tbody></table>
  <table class="allot">${head}<tbody>${rows.slice(13).join('')}</tbody></table>
</div>`;
}

function officerPages(kind: 'Offizier' | 'Stab', file: KeySheetFile, model: string, key: OfficerKey, note: string): string[] {
  const days = [...key.days].sort((a, b) => b.day - a.day);
  return [
    `<section class="page">
  <div class="stamp">${kind}!</div>
  ${heading(1, `${kind}-Schlüssel ${model}`)}
  <p class="lead">Schlüsselnetz <b>${escape(file.network.toUpperCase())}</b>, Monat ${escape(monthName(file.month))}. Nur für Offiziere.</p>
  <table class="keys">
    <thead><tr><th>Datum</th><th>Umkehr&shy;walze</th><th>Walzenlage</th><th>Ring&shy;stellung</th><th>Steckerverbindungen</th></tr></thead>
    <tbody>${days.map(officerKeyRow).join('')}</tbody>
  </table>
  <p class="note">${note}</p>
</section>`,
    `<section class="page">
  ${heading(2, `${kind}-Einstellungen ${monthName(file.month)}`)}
  ${settingTable(key.settings)}
  <p class="note">Eine Einstellung wählen, die Walzen darauf stellen und den Spruch schlüsseln. Der Funker schlüsselt ihn mit dem
  Tagesschlüssel erneut, mit ${kind.toUpperCase()} und dem Namen der Einstellung davor, zum Beispiel ${kind.toUpperCase()} BRUNO.</p>
</section>`,
  ];
}

/** The printable Offizier key of the sheet: its daily keys and the month's 26 settings. Null when the file has none. */
export function offizierDocument(file: KeySheetFile, model: string): string | null {
  const note = 'Umkehrwalze, Walzenlage und Ringstellung wie im Tagesschlüssel; eigene Steckerverbindungen für je zwei Tage.';
  return file.offizier ? page(`Offizier ${file.network} ${file.month}`, officerPages('Offizier', file, model, file.offizier, note)) : null;
}

/** The printable Stab key of the sheet: its daily keys and the month's 26 settings. Null when the file has none. */
export function stabDocument(file: KeySheetFile, model: string): string | null {
  const note = 'Eigene Umkehrwalze, Walzenlage und Ringstellung für je drei Tage, eigene Steckerverbindungen für jeden Tag.';
  return file.stab ? page(`Stab ${file.network} ${file.month}`, officerPages('Stab', file, model, file.stab, note)) : null;
}

/** The printable Stichwort envelopes of the year, with the rule for applying a Stichwort. Null when the file has none. */
export function stichwortDocument(file: KeySheetFile): string | null {
  const set = file.stichwoerter;
  if (!set) {
    return null;
  }
  const envelopes = set.envelopes.map(
    (envelope) => `<div class="envelope">
    <p class="band-title">Umschlag ${escape(envelope.name)}</p>
    <p>Nur auf Befehl STICHWORTBEFEHL ${escape(envelope.name)} öffnen.</p>
    <p class="word">${inked(envelope.word)}</p>
  </div>`,
  );
  return page(stichwortName(file), [
    `<section class="page">
  <div class="stamp">Geheim!</div>
  ${heading(1, `Stichwortbefehle ${set.year}`)}
  ${heading(2, 'Ausführungsbestimmungen')}
  <p class="lead">Auf den Befehl STICHWORTBEFEHL und den Namen eines Umschlags wird der Umschlag geöffnet und jeder Tagesschlüssel mit
  dem Wort darin geändert. Die Buchstaben zählen A = 1 bis Z = 26.</p>
  <table class="allot">
    <thead><tr><th>Buchstabe</th><th>Änderung</th></tr></thead>
    <tbody>
      <tr><td>1.</td><td>zu jeder Walzennummer addieren, nach VIII wieder ab I (VI + D = II)</td></tr>
      <tr><td>2., 3., 4.</td><td>zur Ringstellung der linken, mittleren und rechten Walze addieren</td></tr>
      <tr><td>5.</td><td>zu jedem Buchstaben der Steckerverbindungen addieren</td></tr>
      <tr><td>6.</td><td>Blindbuchstabe</td></tr>
    </tbody>
  </table>
  <p class="note">Griechenwalze, Umkehrwalze und Grundstellung bleiben. Beispiel DANZIG: die Walzenlage VI I VIII wird II V IV, die
  Ringstellung 01 01 05 wird 02 15 05, die Verbindung AB wird JK. Die Bestimmungen werden nur mündlich weitergegeben.</p>
</section>`,
    `<section class="page">${heading(2, 'Umschläge')}<div class="envelopes">${envelopes.join('')}</div></section>`,
  ]);
}

function weatherTable(table: Wetterkurzschluessel['tables'][number]): string {
  const width = table.columns.length;
  const rows = table.rows.map((row) =>
    row.cells.length === 1 && width > 1
      ? `<tr><th>${escape(row.heading)}</th><td colspan="${width}">${escape(row.cells[0] ?? '')}</td></tr>`
      : `<tr><th>${escape(row.heading)}</th>${row.cells.map((cell) => `<td>${escape(cell)}</td>`).join('')}</tr>`,
  );
  return `<div class="band">
  <p class="band-title">Tafel ${table.number} · ${escape(table.title)}${table.historical ? ' *' : ''}</p>
  <table class="allot weather"><thead><tr><th></th>${table.columns.map((c) => `<th>${escape(c)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
</div>`;
}

function settingIssue(issue: WetterTafelSet['issues'][number]): string {
  const rows = [...alphabet].map((letter, i) => `<tr><th>${letter}</th>${issue.columns.map((column) => `<td>${escape(column[i] ?? '')}</td>`).join('')}</tr>`);
  return `<section class="page">
  ${heading(2, `Spruchschlüsseltafel · Kennwort ${issue.kennwort}`)}
  <p class="lead">Gültig vom ${germanDate(issue.from)} bis ${germanDate(issue.until)}</p>
  <table class="allot weather"><thead><tr><th>Kenn&shy;buchstabe</th>${periods.map((p) => `<th>${p} Uhr</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>
  <p class="note">Die Spalte nach der Uhrzeit des Spruchs wählen. Auf der M4 steht die Griechenwalze auf A.</p>
</section>`;
}

/**
 * The printable Wetterkurzschlüssel with the year's Spruchschlüsseltafeln für Wetterkurzfunksprüche. Null when the file has no weather
 * tables.
 */
export function wetterDocument(file: KeySheetFile, book: Wetterkurzschluessel): string | null {
  const set = file.wetterTafeln;
  if (!set) {
    return null;
  }
  const titles = new Map(book.tables.map((table) => [table.number, table.title]));
  const order = book.order.map((number, i) => `<tr><td>${i + 1}.</td><td>Tafel ${number}</td><td>${escape(titles.get(number) ?? '')}</td></tr>`);
  const signature = `${book.order.length + 1}.–${book.order.length + book.signatureLetters}.`;
  return page(wetterName(file), [
    `<section class="page">
  <div class="stamp">Geheim!</div>
  ${heading(1, 'Wetterkurzschlüssel')}
  <p class="lead">2. Auflage, mit den Spruchschlüsseltafeln für ${set.year}</p>
  ${heading(2, 'Aufbau des Wetterkurzsignals')}
  <table class="allot">
    <thead><tr><th>Buchstabe</th><th>Tafel</th><th>Inhalt</th></tr></thead>
    <tbody>${order.join('')}<tr><td>${signature}</td><td></td><td>Kennung des Bootes</td></tr></tbody>
  </table>
  <p class="note">Gesendet werden WW, die Uhrzeit und Gruppen zu vier Buchstaben; der erste Buchstabe ist der Kennbuchstabe. Kennbuchstabe
  und Uhrzeit geben die Einstellung aus der Spruchschlüsseltafel. Tafeln mit * sind überliefert, die anderen nachgebildet.</p>
</section>`,
    `<section class="page">${book.tables.map(weatherTable).join('')}</section>`,
    ...set.issues.map(settingIssue),
  ]);
}

/** The name of the weather document, such as Wetterkurzschluessel-1944. */
export function wetterName(file: KeySheetFile): string {
  return `Wetterkurzschluessel-${file.wetterTafeln?.year ?? file.month.slice(0, 4)}`;
}

/** The name of the Stichwort document, such as Stichwort-1944. */
export function stichwortName(file: KeySheetFile): string {
  return `Stichwort-${file.stichwoerter?.year ?? file.month.slice(0, 4)}`;
}
