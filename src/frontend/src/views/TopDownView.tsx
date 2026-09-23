import { useRef } from 'react';
import { Key } from '../components/Key';
import { Lamp } from '../components/Lamp';
import { RotorWindow } from '../components/RotorWindow';
import { Thumbwheel } from '../components/Thumbwheel';
import { keyboardRows, shiftLetter, slots } from '../machine';
import { useMachine } from '../store';
import { useKeys, usePhysicalKeyboard } from '../useKeys';

const width = 640;
const pitch = 62;
const rotorsY = 78;
const lampRowsY = [196, 256, 316];
const keyRowsY = [436, 496, 556];

function rowX(row: string, index: number): number {
  return width / 2 + (index - (row.length - 1) / 2) * pitch;
}

/** Turns rotors toward a target letter, so quick turns add up before the backend answers. */
function useTurnRotor(): (slot: string, position: string, steps: number) => void {
  const turnRotor = useMachine((store) => store.turnRotor);
  const targets = useRef(new Map<string, string>());

  return (slot, position, steps) => {
    const next = shiftLetter(targets.current.get(slot) ?? position, steps);
    targets.current.set(slot, next);
    void turnRotor(slot, next).then(() => {
      if (targets.current.get(slot) === next) {
        targets.current.delete(slot);
      }
    });
  };
}

export function TopDownView() {
  const machine = useMachine((store) => store.machine);
  const keys = useKeys();
  const turn = useTurnRotor();
  usePhysicalKeyboard(keys);

  if (!machine) {
    return null;
  }

  const machineSlots = slots[machine.model] ?? [];
  const rotorPitch = 96;

  return (
    <section className="top-down" aria-label="Top-down">
      <svg className="machine" viewBox={`0 0 ${width} 610`}>
        <defs>
          <radialGradient id="lamp-lit" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="#fff6c8" />
            <stop offset="55%" stopColor="#ffd45c" />
            <stop offset="100%" stopColor="#e39a1c" />
          </radialGradient>
          <radialGradient id="key-cap" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#3a3835" />
            <stop offset="100%" stopColor="#0d0d0c" />
          </radialGradient>
        </defs>

        <rect className="case" x={0} y={0} width={width} height={610} rx={18} />
        <rect className="lid" x={16} y={16} width={width - 32} height={352} rx={10} />

        <g aria-label="Rotors" role="group">
          <rect className="rotor-plate" x={width / 2 - (machineSlots.length * rotorPitch) / 2} y={rotorsY - 50} width={machineSlots.length * rotorPitch} height={100} rx={8} />
          {machineSlots.map((slot, index) => {
            const rotor = machine.rotors.find((r) => r.slot === slot);
            const x = width / 2 + (index - (machineSlots.length - 1) / 2) * rotorPitch - 12;
            const onTurn = (steps: number) => rotor && turn(slot, rotor.position, steps);
            return (
              <g key={slot}>
                <RotorWindow slot={slot} position={rotor?.position ?? null} x={x} y={rotorsY} onTurn={onTurn} />
                <Thumbwheel slot={slot} disabled={!rotor} x={x + 40} y={rotorsY} onTurn={onTurn} />
              </g>
            );
          })}
        </g>
        {machine.rotors.length === 0 && (
          <text className="machine-note" x={width / 2} y={rotorsY + 72}>
            The rotors are out. Insert them in the open-lid view.
          </text>
        )}

        <g aria-label="Lampboard" role="group">
          {keyboardRows.map((row, rowIndex) =>
            [...row].map((letter, index) => (
              <Lamp key={letter} letter={letter} lit={machine.litLamp === letter} x={rowX(row, index)} y={lampRowsY[rowIndex]} />
            )),
          )}
        </g>

        <g aria-label="Keyboard" role="group">
          {keyboardRows.map((row, rowIndex) =>
            [...row].map((letter, index) => (
              <Key key={letter} letter={letter} down={machine.heldKey === letter} x={rowX(row, index)} y={keyRowsY[rowIndex]} keys={keys} />
            )),
          )}
        </g>
      </svg>
    </section>
  );
}
