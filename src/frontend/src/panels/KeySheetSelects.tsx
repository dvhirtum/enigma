import type { KeySheetSummary } from '../api';

export const provenanceLabels: Record<string, string> = {
  Historical: 'historical',
  Generated: 'generated',
  UserDefined: 'user-defined',
};

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthName = (month: string) => `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function sheetLabel(sheet: KeySheetSummary): string {
  return `${sheet.network} (${provenanceLabels[sheet.provenance] ?? sheet.provenance})`;
}

/** Groups items by key, keeping the order of the items. */
function groupBy<T>(items: T[], key: (item: T) => string): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    groups.set(key(item), [...(groups.get(key(item)) ?? []), item]);
  }
  return [...groups];
}

/** The months that have sheets, newest first. */
function sheetMonths(sheets: KeySheetSummary[]): string[] {
  return [...new Set(sheets.map((sheet) => sheet.month))].sort().reverse();
}

/** The months that have sheets by year: the newest year first, its months in calendar order. */
function monthsByYear(months: string[]): [string, string[]][] {
  return groupBy([...months].sort(), (month) => month.slice(0, 4)).reverse();
}

/** The sheets of `month` by model; in each model historical sheets first, then by network. */
function sheetsByModel(sheets: KeySheetSummary[], month: string): [string, KeySheetSummary[]][] {
  const sorted = sheets
    .filter((sheet) => sheet.month === month)
    .sort((a, b) => a.model.localeCompare(b.model) || Number(b.readOnly) - Number(a.readOnly) || a.network.localeCompare(b.network));
  return groupBy(sorted, (sheet) => sheet.model);
}

/** The month shown: the one chosen when it has sheets, else the current month when it has sheets, else the newest. */
export function shownMonth(sheets: KeySheetSummary[], chosen: string | null): string {
  const months = sheetMonths(sheets);
  if (chosen !== null && months.includes(chosen)) {
    return chosen;
  }
  return months.includes(currentMonth()) ? currentMonth() : (months[0] ?? '');
}

/** Picks a month that has sheets, then one of its sheets, grouped by model. */
export function KeySheetSelects({
  sheets,
  month,
  sheetId,
  onMonth,
  onSheet,
  labelClassName,
}: {
  sheets: KeySheetSummary[];
  month: string;
  sheetId: string;
  onMonth: (month: string) => void;
  onSheet: (sheetId: string) => void;
  labelClassName?: string;
}) {
  const months = sheetMonths(sheets);
  return (
    <>
      <label className={labelClassName}>
        Month
        <select value={month} disabled={months.length === 0} onChange={(event) => onMonth(event.target.value)}>
          {months.length === 0 && <option value="">No key sheets yet</option>}
          {monthsByYear(months).map(([year, yearMonths]) => (
            <optgroup key={year} label={year}>
              {yearMonths.map((value) => (
                <option key={value} value={value}>
                  {monthName(value)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <label className={labelClassName}>
        Key sheet
        <select value={sheetId} disabled={months.length === 0} onChange={(event) => onSheet(event.target.value)}>
          <option value="">Choose a sheet</option>
          {sheetsByModel(sheets, month).map(([model, modelSheets]) => (
            <optgroup key={model} label={model}>
              {modelSheets.map((summary) => (
                <option key={summary.id} value={summary.id}>
                  {sheetLabel(summary)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  );
}
