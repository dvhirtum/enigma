import { useCallback, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
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
const drumRadius = 64;
const ringWidth = 16;
const faceLetterRadius = 38;
const rackPitch = 64;
const wheelX = [width / 2 - 390, width / 2 - 140, width / 2 + 110, width / 2 + 360];
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

const letterIndex = (letter: string) => letter.charCodeAt(0) - 65;
const degreesPerLetter = 360 / 26;

/** The ring letter `steps` letters on from `ring`. */
const ringAt = (ring: string, steps: number) => alphabet[(((letterIndex(ring) + steps) % 26) + 26) % 26];

/** The angle of the pointer around the drum centre in the SVG, clockwise from the top, in degrees. */
function pointerAngle(element: SVGElement, event: ReactPointerEvent, x: number): number {
  const matrix = element.ownerSVGElement?.getScreenCTM();
  if (!matrix) {
    return 0;
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return (Math.atan2(point.x - x, wheelY - point.y) * 180) / Math.PI;
}

interface CheckDrumProps {
  x: number;
  rotor: string;
  window: string;
  ring: string;
  slot: string;
  onTurn: (steps: number) => void;
  onTurnRing: (steps: number) => void;
}

/**
 * A checking machine drum: the letters round its face, the window letter at the index mark on top, and its coloured
 * ring with a black dot at the ring letter. Dragging the ring (or Arrow Up/Down on it) sets the ring; the thumbwheel
 * turns the drum, ring and all.
 */
function CheckDrum({ x, rotor, window, ring, slot, onTurn, onTurnRing }: CheckDrumProps) {
  const drag = useRef<{ pointer: number; start: number } | null>(null);
  const [dragSteps, setDragSteps] = useState(0);
  const shownRing = ringAt(ring, dragSteps);
  const dotAngle = (letterIndex(shownRing) - letterIndex(window)) * degreesPerLetter;
  const rimRadius = drumRadius - ringWidth / 2;

  const onPointerDown = (event: ReactPointerEvent<SVGCircleElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { pointer: event.pointerId, start: pointerAngle(event.currentTarget, event, x) };
    setDragSteps(0);
  };
  const onPointerMove = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (drag.current?.pointer !== event.pointerId) {
      return;
    }
    const turned = pointerAngle(event.currentTarget, event, x) - drag.current.start;
    setDragSteps(Math.round((((turned % 360) + 540) % 360 - 180) / degreesPerLetter));
  };
  const onPointerUp = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (drag.current?.pointer !== event.pointerId) {
      return;
    }
    drag.current = null;
    setDragSteps(0);
    if (dragSteps !== 0) {
      onTurnRing(dragSteps);
    }
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined) {
      event.preventDefault();
      onTurnRing(steps);
    }
  };

  return (
    <g className="check-drum">
      <circle
        className="rim"
        cx={x}
        cy={wheelY}
        r={rimRadius}
        style={{ stroke: drumColours[rotor] }}
        role="spinbutton"
        aria-label={`${slot} ring`}
        aria-valuemin={1}
        aria-valuemax={26}
        aria-valuenow={letterIndex(shownRing) + 1}
        aria-valuetext={shownRing}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <circle className="face" cx={x} cy={wheelY} r={drumRadius - ringWidth} />
      {[...alphabet].map((letter) => (
        <text
          key={letter}
          className={letter === window ? 'face-letter at-index' : 'face-letter'}
          x={x}
          y={wheelY - faceLetterRadius}
          transform={`rotate(${(letterIndex(letter) - letterIndex(window)) * degreesPerLetter} ${x} ${wheelY})`}
          aria-hidden="true"
        >
          {letter}
        </text>
      ))}
      <circle className="ring-dot" cx={x} cy={wheelY - rimRadius} r={4} transform={`rotate(${dotAngle} ${x} ${wheelY})`} aria-hidden="true" />
      <path className="index-mark" d={`M ${x - 7} ${wheelY - drumRadius - 12} L ${x + 7} ${wheelY - drumRadius - 12} L ${x} ${wheelY - drumRadius - 2} Z`} aria-hidden="true" />
      <text className="drum-window" x={x} y={wheelY} role="img" aria-label={`${slot} drum ${rotor} at ${window}, ring ${shownRing}`}>
        {window}
      </text>
      <text className="drum-name" x={x} y={wheelY + drumRadius + 20}>
        {rotor}
      </text>
      <Thumbwheel slot={slot} disabled={false} x={x + drumRadius + 22} y={wheelY} onTurn={onTurn} />
    </g>
  );
}

/**
 * The Hut 8 checking machine: a reflector wheel and three drums with Bombe drum letters and a ring each, without
 * plugboard or stepping, with the spare drums in the rack above, a row of 26 lamps and a row of 26 keys. The drums turn
 * by thumbwheel and the rings by dragging; a key, clicked or typed, lights the lamp its letter goes to.
 */
export function CheckingMachine() {
  const check = useMachine((store) => store.check);
  const lamp = useMachine((store) => store.checkLamp);
  const stepCheckDrum = useMachine((store) => store.stepCheckDrum);
  const stepCheckRing = useMachine((store) => store.stepCheckRing);
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
          window={check.machineWindows[drum]}
          ring={check.machineRings[drum]}
          slot={slots[drum]}
          onTurn={(steps) => void stepCheckDrum(drum, steps)}
          onTurnRing={(steps) => void stepCheckRing(drum, steps)}
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
