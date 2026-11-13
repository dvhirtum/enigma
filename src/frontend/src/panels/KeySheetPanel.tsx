import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { DailyKey, KeySheet } from '../api';
import { models } from '../machine';
import { useMachine, type PrintOptions } from '../store';
import { KeySheetSelects, provenanceLabels, shownMonth } from './KeySheetSelects';

function currentYear(): number {
  return new Date().getFullYear();
}

const ring = (value: number) => String(value).padStart(2, '0');

type Mode = 'view' | 'generate';

/** The documents that can be printed besides the key sheet, each with its tick box. */
const printLabels: [keyof PrintOptions, string][] = [
  ['procedure', 'Also print the Kenngruppenbuch and Tauschtafeln'],
  ['offizier', 'Also print the Offizier key'],
  ['stab', 'Also print the Stab key'],
  ['stichwort', 'Also print the Stichwort envelopes'],
  ['wetter', 'Also print the Wetterkurzschlüssel'],
];

function GenerateForm({ onDone }: { onDone: () => void }) {
  const generate = useMachine((store) => store.generateKeySheets);
  const currentModel = useMachine((store) => store.machine?.model ?? 'M3');
  const [model, setModel] = useState(currentModel);
  const [year, setYear] = useState(currentYear);
  const [generating, setGenerating] = useState(false);
  const running = useRef(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (running.current) {
      return;
    }
    running.current = true;
    setGenerating(true);
    try {
      if (await generate(model, year)) {
        onDone();
      }
    } finally {
      running.current = false;
      setGenerating(false);
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
        <button type="submit" disabled={generating}>
          Generate
        </button>
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
  const [options, setOptions] = useState<Required<PrintOptions>>({ procedure: true, offizier: false, stab: false, stichwort: false, wetter: false });

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
        <button type="button" onClick={() => void printKeySheet(options)}>
          Print to PDF
        </button>
        {!sheet.readOnly && (
          <button type="button" onClick={() => setDeleting(true)}>
            Delete
          </button>
        )}
      </div>
      {printLabels.map(([option, label]) => (
        <label key={option} className="sheet-option">
          <input type="checkbox" checked={options[option]} onChange={(event) => setOptions({ ...options, [option]: event.target.checked })} />
          {label}
        </label>
      ))}
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
  const month = sheet?.month ?? shownMonth(sheets, chosenMonth);

  useEffect(() => {
    void loadKeySheets();
  }, [loadKeySheets]);

  const chooseMonth = (value: string) => {
    setChosenMonth(value);
    void openKeySheet(null).then(view);
  };

  return (
    <div className="key-sheets">
      <KeySheetSelects
        sheets={sheets}
        month={month}
        sheetId={sheet?.id ?? ''}
        onMonth={chooseMonth}
        onSheet={(id) => void openKeySheet(id || null).then(view)}
      />
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
