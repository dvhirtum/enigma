import { useCallback, useRef, useState } from 'react';
import { Key } from '../components/Key';
import { Lamp } from '../components/Lamp';
import { Thumbwheel } from '../components/Thumbwheel';
import { alphabet } from '../machine';
import { useMachine } from '../store';
import { usePhysicalKeyboard, type Keys } from '../useKeys';
import { drumColours, rotors } from './drums';

const pitch = 50;
const margin = 40;
const width = margin * 2 + pitch * 26;
const rackY = 60;
const wheelY = 200;
const lampY = 345;
const keyY = 420;
const height = keyY + 55;
const drumRadius = 44;
const rackPitch = 64;
const wheelX = [width / 2 - 300, width / 2 - 110, width / 2 + 50, width / 2 + 210];
const slots = ['left', 'middle', 'right'];
/** Drums light enough to need dark lettering. */
const lightDrums = new Set(['IV', 'VIII']);

/** Presses one key at a time on the checking machine; its lamp stays lit while the key is held. */
function useCheckKeys(): { keys: Keys; down: string | null } {
  const pressCheckKey = useMachine((store) => store.pressCheckKey);
  const releaseCheckKey = useMachine((store) => store.releaseCheckKey);
  const held = useRef<string | null>(null);
  const [down, setDown] = useState<string | null>(null);

  const press = useCallback(
    (letter: string) => {
      if (held.current) {
        return false;
      }
      held.current = letter;
      setDown(letter);
      void pressCheckKey(letter);
      return true;
    },
    [pressCheckKey],
  );
  const release = useCallback(() => {
    held.current = null;
    setDown(null);
    releaseCheckKey();
  }, [releaseCheckKey]);

  return { keys: { press, release }, down };
}

interface CheckDrumProps {
  x: number;
  rotor: string;
  letter: string;
  slot: string;
  onTurn: (steps: number) => void;
}

function CheckDrum({ x, rotor, letter, slot, onTurn }: CheckDrumProps) {
  const angle = ((letter.charCodeAt(0) - 65) * 360) / 26;
  return (
    <g className="check-drum">
      <circle className="rim" cx={x} cy={wheelY} r={drumRadius} style={{ fill: drumColours[rotor] }} />
      <circle className="face" cx={x} cy={wheelY} r={drumRadius - 14} />
      <line className="marker" x1={x} y1={wheelY - drumRadius + 2} x2={x} y2={wheelY - drumRadius + 12} transform={`rotate(${angle} ${x} ${wheelY})`} />
      <text className="drum-window" x={x} y={wheelY} role="img" aria-label={`${slot} drum ${rotor} at ${letter}`}>
        {letter}
      </text>
      <text className="drum-name" x={x} y={wheelY + drumRadius + 20}>
        {rotor}
      </text>
      <Thumbwheel slot={slot} disabled={false} x={x + drumRadius + 22} y={wheelY} onTurn={onTurn} />
    </g>
  );
}

/**
 * The Hut 8 checking machine: a reflector wheel and three drums set by the Bombe drum letters, without plugboard or
 * stepping, with the spare drums in the rack above, a row of 26 lamps and a row of 26 keys. The drums turn by
 * thumbwheel; a key, clicked or typed, lights the lamp its letter goes to.
 */
export function CheckingMachine() {
  const check = useMachine((store) => store.check);
  const lamp = useMachine((store) => store.checkLamp);
  const stepCheckDrum = useMachine((store) => store.stepCheckDrum);
  const { keys, down } = useCheckKeys();
  usePhysicalKeyboard(keys);

  if (!check) {
    return null;
  }
  const drums = check.key.wheelOrder.split(' ');
  const rackLeft = width / 2 - ((rotors.length - 1) * rackPitch) / 2;

  return (
    <svg className="checking-machine" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Checking machine">
      <rect className="panel" x={4} y={4} width={width - 8} height={height - 8} rx={16} />
      <g className="drum-rack" aria-hidden="true">
        <rect x={rackLeft - 44} y={rackY - 34} width={(rotors.length - 1) * rackPitch + 88} height={68} rx={8} />
        {rotors.map((rotor, index) => {
          const inUse = drums.includes(rotor);
          return (
            <g key={rotor} className={['rack-drum', inUse ? 'in-use' : '', !inUse && lightDrums.has(rotor) ? 'light' : ''].filter(Boolean).join(' ')}>
              <circle cx={rackLeft + index * rackPitch} cy={rackY} r={24} style={inUse ? undefined : { fill: drumColours[rotor] }} />
              <text x={rackLeft + index * rackPitch} y={rackY}>
                {rotor}
              </text>
            </g>
          );
        })}
      </g>
      <g className="reflector-wheel">
        <circle cx={wheelX[0]} cy={wheelY} r={drumRadius} />
        <text x={wheelX[0]} y={wheelY} role="img" aria-label={`Reflector ${check.key.reflector}`}>
          {check.key.reflector}
        </text>
      </g>
      {drums.map((rotor, drum) => (
        <CheckDrum
          key={slots[drum]}
          x={wheelX[drum + 1]}
          rotor={rotor}
          letter={check.position[drum]}
          slot={slots[drum]}
          onTurn={(steps) => void stepCheckDrum(drum, steps)}
        />
      ))}
      {[...alphabet].map((letter, index) => (
        <Lamp key={letter} letter={letter} lit={lamp === letter} x={margin + pitch / 2 + index * pitch} y={lampY} />
      ))}
      {[...alphabet].map((letter, index) => (
        <Key key={letter} letter={letter} down={down === letter} x={margin + pitch / 2 + index * pitch} y={keyY} keys={keys} />
      ))}
    </svg>
  );
}
