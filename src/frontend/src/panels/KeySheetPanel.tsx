import { useEffect, useId, useState, type FormEvent } from 'react';
import type { DailyKey, KeySheet, KeySheetSummary } from '../api';
import { models } from '../machine';
import { useMachine } from '../store';

const provenanceLabels: Record<string, string> = {
  Historical: 'historical',
  Generated: 'generated',
  UserDefined: 'user-defined',
};

const textFormat = 'One row per day: day, reflector, rotors, rings (01–26), plugs, Kenngruppen.';
const textExample = '1 B-thin Beta II IV I 01 01 01 22 AT BL DF GJ HM NW OP QY RZ VX ABC DEF';

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function sheetLabel(sheet: KeySheetSummary): string {
  return `${sheet.network} ${sheet.month} · ${sheet.model} (${provenanceLabels[sheet.provenance] ?? sheet.provenance})`;
}

const ring = (value: number) => String(value).padStart(2, '0');

type Mode = { kind: 'view' } | { kind: 'generate' } | { kind: 'new' } | { kind: 'edit'; sheet: KeySheet };

function GenerateForm({ onDone }: { onDone: () => void }) {
  const generate = useMachine((store) => store.generateKeySheet);
  const currentModel = useMachine((store) => store.machine?.model ?? 'M3');
  const [model, setModel] = useState(currentModel);
  const [network, setNetwork] = useState('');
  const [month, setMonth] = useState(currentMonth);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (await generate(model, network, month)) {
      onDone();
    }
  };

  return (
    <form className="sheet-form" aria-label="Generate key sheet" onSubmit={(event) => void submit(event)}>
      <label>
        Model
        <select value={model} onChange={(event) => setModel(event.target.value)}>
          {models.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      <label>
        Network
        <input value={network} required onChange={(event) => setNetwork(event.target.value)} />
      </label>
      <label>
        Month
        <input type="month" value={month} required onChange={(event) => setMonth(event.target.value)} />
      </label>
      <div className="sheet-actions">
        <button type="submit">Generate</button>
        <button type="button" onClick={onDone}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/** Edits a sheet as text rows. Without `sheet` it creates a user-defined sheet. */
function SheetEditor({ sheet, onDone }: { sheet?: KeySheet; onDone: () => void }) {
  const create = useMachine((store) => store.createKeySheet);
  const update = useMachine((store) => store.updateKeySheet);
  const [network, setNetwork] = useState(sheet?.network ?? '');
  const [month, setMonth] = useState(sheet?.month ?? currentMonth);
  const [text, setText] = useState(sheet?.text ?? '');
  const hint = useId();

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const saved = sheet ? await update(sheet.id, network, month, text) : await create(network, month, text);
    if (saved) {
      onDone();
    }
  };

  return (
    <form className="sheet-form" aria-label={sheet ? 'Edit key sheet' : 'New key sheet'} onSubmit={(event) => void submit(event)}>
      <label>
        Network
        <input value={network} required onChange={(event) => setNetwork(event.target.value)} />
      </label>
      <label>
        Month
        <input type="month" value={month} required onChange={(event) => setMonth(event.target.value)} />
      </label>
      <label className="sheet-text">
        Daily keys
        <textarea value={text} rows={12} spellCheck={false} aria-describedby={hint} placeholder={textExample} onChange={(event) => setText(event.target.value)} />
      </label>
      <p id={hint} className="sheet-hint">
        {textFormat}
      </p>
      <div className="sheet-actions">
        <button type="submit">Save</button>
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
      {dailyKey.kenngruppen && dailyKey.kenngruppen.length > 0 && <span className="day-groups">Kenngruppen {dailyKey.kenngruppen.join(' ')}</span>}
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

function SheetView({ sheet, onEdit }: { sheet: KeySheet; onEdit: () => void }) {
  const exportKeySheet = useMachine((store) => store.exportKeySheet);
  const deleteKeySheet = useMachine((store) => store.deleteKeySheet);
  const [deleting, setDeleting] = useState(false);

  return (
    <section className="sheet" aria-label={`${sheet.network} ${sheet.month}`}>
      <p className="sheet-meta">
        {sheet.model} · {provenanceLabels[sheet.provenance] ?? sheet.provenance}
        {sheet.source && ` · ${sheet.source}`}
      </p>
      <div className="sheet-actions">
        {!sheet.readOnly && (
          <button type="button" onClick={onEdit}>
            Edit
          </button>
        )}
        <button type="button" onClick={() => void exportKeySheet()}>
          Export
        </button>
        {!sheet.readOnly && (
          <button type="button" onClick={() => setDeleting(true)}>
            Delete
          </button>
        )}
      </div>
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

/** Lists, edits and applies key sheets. */
export function KeySheetPanel() {
  const sheets = useMachine((store) => store.keySheets);
  const sheet = useMachine((store) => store.keySheet);
  const loadKeySheets = useMachine((store) => store.loadKeySheets);
  const openKeySheet = useMachine((store) => store.openKeySheet);
  const importKeySheet = useMachine((store) => store.importKeySheet);
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const view = () => setMode({ kind: 'view' });

  useEffect(() => {
    void loadKeySheets();
  }, [loadKeySheets]);

  return (
    <div className="key-sheets">
      <label>
        Key sheet
        <select value={sheet?.id ?? ''} onChange={(event) => void openKeySheet(event.target.value || null).then(view)}>
          <option value="">{sheets.length > 0 ? 'Choose a sheet' : 'No key sheets yet'}</option>
          {sheets.map((summary) => (
            <option key={summary.id} value={summary.id}>
              {sheetLabel(summary)}
            </option>
          ))}
        </select>
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={() => setMode({ kind: 'new' })}>
          New
        </button>
        <button type="button" onClick={() => setMode({ kind: 'generate' })}>
          Generate
        </button>
        <button type="button" onClick={() => void importKeySheet().then((imported) => imported && view())}>
          Import
        </button>
      </div>
      {mode.kind === 'generate' && <GenerateForm onDone={view} />}
      {mode.kind === 'new' && <SheetEditor onDone={view} />}
      {mode.kind === 'edit' && <SheetEditor sheet={mode.sheet} onDone={view} />}
      {mode.kind === 'view' && sheet && <SheetView key={sheet.id} sheet={sheet} onEdit={() => setMode({ kind: 'edit', sheet })} />}
    </div>
  );
}
