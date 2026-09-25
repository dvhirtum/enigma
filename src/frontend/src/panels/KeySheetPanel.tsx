import { useEffect, useState, type FormEvent } from 'react';
import type { DailyKey, KeySheet, KeySheetSummary } from '../api';
import { models } from '../machine';
import { useMachine } from '../store';

const provenanceLabels: Record<string, string> = {
  Historical: 'historical',
  Generated: 'generated',
  UserDefined: 'user-defined',
};

function currentYear(): number {
  return new Date().getFullYear();
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const monthName = (month: string) => `${monthNames[Number(month.slice(5, 7)) - 1]} ${month.slice(0, 4)}`;

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

const ring = (value: number) => String(value).padStart(2, '0');

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

type Mode = 'view' | 'generate';

function GenerateForm({ onDone }: { onDone: () => void }) {
  const generate = useMachine((store) => store.generateKeySheets);
  const currentModel = useMachine((store) => store.machine?.model ?? 'M3');
  const [model, setModel] = useState(currentModel);
  const [year, setYear] = useState(currentYear);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await generate(model, year)) {
      onDone();
    }
  };

  return (
    <form className="sheet-form" aria-label="Generate key sheets" onSubmit={(event) => void submit(event)}>
      <label>
        Model
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          {models.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Year
        <input type="number" min={1} max={9999} value={year} required onChange={(event) => setYear(event.target.valueAsNumber)} />
      </label>
      <p className="sheet-hint">One sheet per month for every network of the Kenngruppenbuch.</p>
      <div className="sheet-actions">
        <button type="submit">Generate</button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Applies a daily key; when the sheet is for the other model it asks first, as the machine is replaced. */
function DayRow({ sheet, dailyKey }: { sheet: KeySheet; dailyKey: DailyKey }) {
  const model = useMachine((store) => store.machine?.model);
  const keyHeld = useMachine((store) => store.machine?.heldKey != null);
  const applyDailyKey = useMachine((store) => store.applyDailyKey);
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const [confirming, setConfirming] = useState(false);
  const applied = appliedKey?.sheetId === sheet.id && appliedKey.day === dailyKey.day ? appliedKey : null;

  const apply = () => {
    setConfirming(false);
    void applyDailyKey(sheet.id, dailyKey.day);
  };

  return (
    <li className="day" aria-label={`Day ${dailyKey.day}`} aria-current={applied ? 'true' : undefined}>
      <span className="day-number">{dailyKey.day}</span>
      <span className="day-inner">
        UKW {dailyKey.reflector} · {dailyKey.rotors.join(' ')} · {dailyKey.rings.map(ring).join(' ')}
      </span>
      <button type="button" disabled={keyHeld} onClick={() => (sheet.model === model ? apply() : setConfirming(true))}>
        Apply
      </button>
      <span className="day-plugs">{dailyKey.plugs.join(' ') || 'no plugs'}</span>
      {dailyKey.grundstellung && <span className="day-groups">Grundstellung {dailyKey.grundstellung}</span>}
      {applied && <span className="day-applied">{applied.modified ? 'Applied, since modified' : 'Applied'}</span>}
      {confirming && (
        <p className="day-confirm" role="group" aria-label="Confirm model switch">
          Switch to the {sheet.model}? This resets the machine.
          <button type="button" onClick={apply}>
            Switch
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </p>
      )}
    </li>
  );
}

function SheetView({ sheet }: { sheet: KeySheet }) {
  const exportKeySheet = useMachine((store) => store.exportKeySheet);
  const printKeySheet = useMachine((store) => store.printKeySheet);
  const deleteKeySheet = useMachine((store) => store.deleteKeySheet);
  const [deleting, setDeleting] = useState(false);
  const [withProcedure, setWithProcedure] = useState(true);

  return (
    <section className="sheet" aria-label={`${sheet.network} ${sheet.month}`}>
      <p className="sheet-meta">
        {sheet.model} · {provenanceLabels[sheet.provenance] ?? sheet.provenance}
        {sheet.source && ` · ${sheet.source}`}
      </p>
      <div className="sheet-actions">
        <button type="button" onClick={() => void exportKeySheet()}>
          Export
        </button>
        <button type="button" onClick={() => void printKeySheet(withProcedure)}>
          Print to PDF
        </button>
        {!sheet.readOnly && (
          <button type="button" onClick={() => setDeleting(true)}>
            Delete
          </button>
        )}
      </div>
      <label className="sheet-option">
        <input type="checkbox" checked={withProcedure} onChange={(event) => setWithProcedure(event.target.checked)} />
        Also print the Kenngruppenbuch and Tauschtafeln
      </label>
      {deleting && (
        <p className="day-confirm" role="group" aria-label="Confirm delete">
          Delete {sheet.network} {sheet.month}?
          <button type="button" onClick={() => void deleteKeySheet(sheet.id)}>
            Delete
          </button>
          <button type="button" onClick={() => setDeleting(false)}>
            Cancel
          </button>
        </p>
      )}
      <ol className="days" aria-label="Daily keys">
        {sheet.days.map((dailyKey) => (
          <DayRow key={dailyKey.day} sheet={sheet} dailyKey={dailyKey} />
        ))}
      </ol>
    </section>
  );
}

/** Lists, generates, imports and applies key sheets. */
export function KeySheetPanel() {
  const sheets = useMachine((store) => store.keySheets);
  const sheet = useMachine((store) => store.keySheet);
  const loadKeySheets = useMachine((store) => store.loadKeySheets);
  const openKeySheet = useMachine((store) => store.openKeySheet);
  const importKeySheet = useMachine((store) => store.importKeySheet);
  const [mode, setMode] = useState<Mode>('view');
  const [chosenMonth, setChosenMonth] = useState<string | null>(null);
  const view = () => setMode('view');
  const months = sheetMonths(sheets);
  const fallback = months.includes(currentMonth()) ? currentMonth() : (months[0] ?? '');
  const month = sheet?.month ?? (chosenMonth !== null && months.includes(chosenMonth) ? chosenMonth : fallback);

  useEffect(() => {
    void loadKeySheets();
  }, [loadKeySheets]);

  const chooseMonth = (value: string) => {
    setChosenMonth(value);
    void openKeySheet(null).then(view);
  };

  return (
    <div className="key-sheets">
      <label>
        Month
        <select value={month} disabled={months.length === 0} onChange={(event) => chooseMonth(event.target.value)}>
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
      <label>
        Key sheet
        <select value={sheet?.id ?? ''} disabled={months.length === 0} onChange={(event) => void openKeySheet(event.target.value || null).then(view)}>
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
      <div className="sheet-actions">
        <button type="button" onClick={() => setMode('generate')}>
          Generate
        </button>
        <button type="button" onClick={() => void importKeySheet().then((imported) => imported && view())}>
          Import
        </button>
      </div>
      {mode === 'generate' && <GenerateForm onDone={view} />}
      {mode === 'view' && sheet && <SheetView key={sheet.id} sheet={sheet} />}
    </div>
  );
}
