import { useState } from 'react';
import type { MachineState, RotorState } from '../api';
import { greekRotors, reflectors, ringLetter, slots } from '../machine';
import { useMachine } from '../store';

const ringSettings = Array.from({ length: 26 }, (_, index) => index + 1);

function ringLabel(ringSetting: number): string {
  return `${String(ringSetting).padStart(2, '0')} ${ringLetter(ringSetting)}`;
}

function fits(slot: string, rotor: string): boolean {
  return (slot === 'Greek') === greekRotors.includes(rotor);
}

const drumWidth = 84;
const drumPitch = 104;
const height = 200;

/** The inside of the machine: reflector, rotors and entry wheel, from left to right. */
function RotorStack({ machine }: { machine: MachineState }) {
  const machineSlots = slots[machine.model] ?? [];
  const width = 120 + machineSlots.length * drumPitch + 90;

  const drum = (slot: string, rotor: RotorState | undefined, x: number) => (
    <g key={slot} transform={`translate(${x} 20)`} role="img" aria-label={rotor ? `${slot} slot: rotor ${rotor.rotor}, ring ${ringLabel(rotor.ringSetting)}, position ${rotor.position}` : `${slot} slot: empty`}>
      {rotor ? (
        <>
          <rect className="drum" width={drumWidth} height={height - 40} rx={10} />
          <rect className="drum-ring" x={6} y={18} width={drumWidth - 12} height={22} rx={3} />
          <text className="drum-ring-text" x={drumWidth / 2} y={33}>
            {ringLabel(rotor.ringSetting)}
          </text>
          <text className="drum-name" x={drumWidth / 2} y={96}>
            {rotor.rotor}
          </text>
          <text className="drum-position" x={drumWidth / 2} y={140}>
            {rotor.position}
          </text>
        </>
      ) : (
        <rect className="drum-empty" width={drumWidth} height={height - 40} rx={10} />
      )}
      <text className="drum-slot" x={drumWidth / 2} y={height - 24}>
        {slot}
      </text>
    </g>
  );

  return (
    <svg className="machine rotor-stack" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Rotor stack">
      <rect className="case" width={width} height={height} rx={14} />
      <g transform="translate(24 20)">
        <rect className="reflector" width={72} height={height - 40} rx={8} />
        <text className="drum-name reflector-name" x={36} y={96}>
          {machine.reflector}
        </text>
        <text className="drum-slot" x={36} y={height - 24}>
          UKW
        </text>
      </g>
      {machineSlots.map((slot, index) =>
        drum(
          slot,
          machine.rotors.find((rotor) => rotor.slot === slot),
          120 + index * drumPitch,
        ),
      )}
      <g transform={`translate(${120 + machineSlots.length * drumPitch} 20)`}>
        <rect className="entry-wheel" width={56} height={height - 40} rx={8} />
        <text className="drum-slot" x={28} y={height - 24}>
          ETW
        </text>
      </g>
    </svg>
  );
}

export function OpenLidView() {
  const machine = useMachine((store) => store.machine);
  const setReflector = useMachine((store) => store.setReflector);
  const insertRotors = useMachine((store) => store.insertRotors);
  const removeRotors = useMachine((store) => store.removeRotors);
  const setRingSetting = useMachine((store) => store.setRingSetting);
  const [choice, setChoice] = useState<string[]>([]);

  if (!machine) {
    return null;
  }

  const machineSlots = slots[machine.model] ?? [];
  const inserted = machine.rotors.length > 0;
  const boxRotors = machine.rotorBox.map((rotor) => rotor.rotor);
  const chosen = machineSlots.map((slot, index) => {
    const rotor = choice[index];
    return rotor && boxRotors.includes(rotor) && fits(slot, rotor) ? rotor : '';
  });

  const choose = (index: number, rotor: string) => {
    setChoice(chosen.map((current, i) => (i === index ? rotor : current === rotor ? '' : current)));
  };

  const remove = () => {
    setChoice(machine.rotors.map((rotor) => rotor.rotor));
    void removeRotors();
  };

  return (
    <section className="open-lid" aria-label="Open lid">
      <RotorStack machine={machine} />

      <div className="setup">
        <fieldset>
          <legend>Reflector</legend>
          <select aria-label="Reflector" value={machine.reflector} onChange={(event) => void setReflector(event.target.value)}>
            {(reflectors[machine.model] ?? []).map((reflector) => (
              <option key={reflector}>{reflector}</option>
            ))}
          </select>
        </fieldset>

        <fieldset>
          <legend>Rotors</legend>
          {inserted ? (
            <button type="button" onClick={remove}>
              Remove rotors
            </button>
          ) : (
            <>
              {machineSlots.map((slot, index) => (
                <label key={slot}>
                  {slot} slot
                  <select value={chosen[index]} onChange={(event) => choose(index, event.target.value)}>
                    <option value="">—</option>
                    {boxRotors
                      .filter((rotor) => fits(slot, rotor))
                      .map((rotor) => (
                        <option key={rotor}>{rotor}</option>
                      ))}
                  </select>
                </label>
              ))}
              <button type="button" disabled={chosen.includes('')} onClick={() => void insertRotors(chosen)}>
                Insert rotors
              </button>
            </>
          )}
        </fieldset>

        <fieldset>
          <legend>Rotor box</legend>
          {inserted && <p className="hint">To change the rings of the inserted rotors, remove them first.</p>}
          <ul className="rotor-box">
            {machine.rotorBox.map((rotor) => (
              <li key={rotor.rotor}>
                <label>
                  <span className="rotor-name">{rotor.rotor}</span>
                  <select
                    aria-label={`Ring setting of rotor ${rotor.rotor}`}
                    value={rotor.ringSetting}
                    onChange={(event) => void setRingSetting(rotor.rotor, Number(event.target.value))}
                  >
                    {ringSettings.map((ringSetting) => (
                      <option key={ringSetting} value={ringSetting}>
                        {ringLabel(ringSetting)}
                      </option>
                    ))}
                  </select>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      </div>
    </section>
  );
}
