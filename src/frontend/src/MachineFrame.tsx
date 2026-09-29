import { useEffect, useState } from 'react';
import { InstructionsIcon, OperatorIcon, PanelIcon } from './components/icons';
import { TabbedViews } from './components/TabbedViews';
import { ErrorToast } from './ErrorToast';
import { models, slots } from './machine';
import { ModeSwitch } from './mode';
import { KeySheetPanel } from './panels/KeySheetPanel';
import { useMachine } from './store';
import { OpenLidView } from './views/OpenLidView';
import { PlugboardView } from './views/PlugboardView';
import { TopDownView } from './views/TopDownView';

const views = [
  { id: 'top-down', label: 'Top-down', View: TopDownView },
  { id: 'open-lid', label: 'Open lid', View: OpenLidView },
  { id: 'plugboard', label: 'Plugboard', View: PlugboardView },
] as const;

function MachineSummary() {
  const machine = useMachine((store) => store.machine);
  if (!machine) {
    return null;
  }

  const rotors =
    machine.rotors.length > 0
      ? (slots[machine.model] ?? []).map((slot) => machine.rotors.find((rotor) => rotor.slot === slot)?.rotor ?? '–').join(' ')
      : '';
  return (
    <p className="summary" aria-label="Machine">
      {machine.model} · UKW {machine.reflector} · {rotors || 'rotors out'}
    </p>
  );
}

function AppliedKeyLabel() {
  const key = useMachine((store) => store.machine?.appliedKey);
  if (!key) {
    return null;
  }

  return (
    <p className="summary" aria-label="Daily key">
      Key: {key.network} {key.month}, day {key.day}
      {key.grundstellung && ` · Grundstellung ${key.grundstellung}`}
      {key.modified && ' (modified)'}
    </p>
  );
}

/** Switches the model once the user confirms that the machine resets. */
function ModelSwitch() {
  const model = useMachine((store) => store.machine?.model);
  const keyHeld = useMachine((store) => store.machine?.heldKey != null);
  const create = useMachine((store) => store.create);
  const [pending, setPending] = useState<string | null>(null);
  if (!model) {
    return null;
  }

  const confirm = (next: string) => {
    setPending(null);
    void create(next);
  };

  return (
    <div className="model">
      <label>
        Model
        <select value={pending ?? model} disabled={keyHeld} onChange={(event) => setPending(event.target.value === model ? null : event.target.value)}>
          {models.map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>
      {pending && (
        <p className="model-confirm" role="group" aria-label="Confirm model switch">
          Switch to the {pending}? This resets the machine.
          <button type="button" onClick={() => confirm(pending)}>
            Switch
          </button>
          <button type="button" onClick={() => setPending(null)}>
            Cancel
          </button>
        </p>
      )}
    </div>
  );
}

export function MachineFrame() {
  const load = useMachine((store) => store.load);
  const version = useMachine((store) => store.version);
  const openNotebook = useMachine((store) => store.openNotebook);
  const openInstructions = useMachine((store) => store.openInstructions);
  const keyHeld = useMachine((store) => store.machine?.heldKey != null);
  const [keySheetsOpen, setKeySheetsOpen] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="frame">
      <header>
        <ModeSwitch disabled={keyHeld} />
        <ModelSwitch />
        <MachineSummary />
        <AppliedKeyLabel />
        <div className="panel-toggles">
          <button type="button" className="panel-toggle" aria-label="Instructions" title="Instructions" onClick={() => void openInstructions()}>
            <InstructionsIcon />
          </button>
          <button type="button" className="panel-toggle" aria-label="Operator's notebook" title="Operator's notebook" onClick={() => void openNotebook()}>
            <OperatorIcon />
          </button>
          <button
            type="button"
            className="panel-toggle"
            aria-label="Key sheets"
            title="Key sheets"
            aria-expanded={keySheetsOpen}
            aria-controls="key-sheet-panel"
            onClick={() => setKeySheetsOpen(!keySheetsOpen)}
          >
            <PanelIcon open={keySheetsOpen} />
          </button>
        </div>
      </header>
      <ErrorToast className="error" />
      <TabbedViews label="Views" views={views} />
      <aside id="key-sheet-panel" className="side-panel" aria-label="Key sheets" hidden={!keySheetsOpen}>
        {keySheetsOpen && <KeySheetPanel />}
      </aside>
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
