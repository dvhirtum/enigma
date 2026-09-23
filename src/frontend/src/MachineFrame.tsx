import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { models } from './machine';
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

  const rotors = machine.rotors.map((rotor) => rotor.rotor).join(' ');
  const windows = machine.rotors.map((rotor) => rotor.position).join('');
  return (
    <p className="summary" aria-label="Machine">
      {machine.model} · UKW {machine.reflector} · {rotors ? `${rotors} · ${windows}` : 'rotors out'}
    </p>
  );
}

function ModelSwitch() {
  const model = useMachine((store) => store.machine?.model);
  const create = useMachine((store) => store.create);
  if (!model) {
    return null;
  }

  return (
    <label className="model">
      Model
      <select value={model} onChange={(event) => void create(event.target.value)}>
        {models.map((name) => (
          <option key={name}>{name}</option>
        ))}
      </select>
    </label>
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
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    void load();
  }, [load]);

  const onTabKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
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
      </header>
      <nav role="tablist" aria-label="Views" onKeyDown={onTabKeyDown}>
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
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
