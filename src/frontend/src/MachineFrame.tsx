import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { models, slots } from './machine';
import { KeySheetPanel } from './panels/KeySheetPanel';
import { OperatorPanel } from './panels/OperatorPanel';
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

/** A window with a side panel on the right. The arrow points left (open it) or right (close it). */
function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg className="panel-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" data-testid={open ? 'panel-icon-close' : 'panel-icon-open'}>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path className="panel-icon-strip" d="M15 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15z" />
      <line x1="15" y1="4" x2="15" y2="20" />
      <path d={open ? 'M5.5 12h6M9 9l3 3-3 3' : 'M12 12H6M8.5 9l-3 3 3 3'} />
    </svg>
  );
}

/** A message pad with a pencil. */
function OperatorIcon() {
  return (
    <svg className="panel-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect className="panel-icon-strip" x="3.5" y="3" width="13" height="18" rx="1.5" />
      <rect x="3.5" y="3" width="13" height="18" rx="1.5" />
      <path d="M6.5 8h7M6.5 11.5h7M6.5 15h4" />
      <path d="M19.5 7.5l1.5 1.5-6 6-2 .5.5-2z" />
    </svg>
  );
}

type Panel = 'keySheets' | 'operator';

function AppliedKeyLabel() {
  const key = useMachine((store) => store.machine?.appliedKey);
  if (!key) {
    return null;
  }

  return (
    <p className="summary" aria-label="Daily key">
      Key: {key.network} {key.month}, day {key.day}
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

function ErrorBanner() {
  const error = useMachine((store) => store.error);
  const dismiss = useMachine((store) => store.dismissError);
  if (!error) {
    return null;
  }

  return (
    <div className="error" role="alert">
      <span>
        {error.title}
        {error.detail && ` ${error.detail}`}
      </span>
      <button type="button" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  );
}

export function MachineFrame() {
  const load = useMachine((store) => store.load);
  const version = useMachine((store) => store.version);
  const [selected, setSelected] = useState(0);
  const [panel, setPanel] = useState<Panel | null>(null);
  const toggle = (next: Panel) => setPanel(panel === next ? null : next);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTabKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (selected + step + views.length) % views.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  const { id, View } = views[selected];

  return (
    <div className="frame">
      <header>
        <h1>Enigma</h1>
        <ModelSwitch />
        <MachineSummary />
        <AppliedKeyLabel />
        <div className="panel-toggles">
          <button
            type="button"
            className="panel-toggle"
            aria-label="Operator mode"
            title="Operator mode"
            aria-expanded={panel === 'operator'}
            aria-controls="operator-panel"
            onClick={() => toggle('operator')}
          >
            <OperatorIcon />
          </button>
          <button
            type="button"
            className="panel-toggle"
            aria-label="Key sheets"
            title="Key sheets"
            aria-expanded={panel === 'keySheets'}
            aria-controls="key-sheet-panel"
            onClick={() => toggle('keySheets')}
          >
            <PanelIcon open={panel === 'keySheets'} />
          </button>
        </div>
      </header>
      <nav role="tablist" aria-label="Views" aria-orientation="vertical" onKeyDown={onTabKeyDown}>
        {views.map((view, index) => (
          <button
            key={view.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={index === selected}
            aria-controls={`panel-${view.id}`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <ErrorBanner />
      <main role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
        <View />
      </main>
      <aside id="key-sheet-panel" className="side-panel" aria-label="Key sheets" hidden={panel !== 'keySheets'}>
        {panel === 'keySheets' && <KeySheetPanel />}
      </aside>
      <aside id="operator-panel" className="side-panel" aria-label="Operator mode" hidden={panel !== 'operator'}>
        {panel === 'operator' && <OperatorPanel />}
      </aside>
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
