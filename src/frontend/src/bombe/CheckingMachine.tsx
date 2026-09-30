import { useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { Key } from '../components/Key';
import { Lamp } from '../components/Lamp';
import { Thumbwheel } from '../components/Thumbwheel';
import { usePlugDrag } from '../components/usePlugDrag';
import { alphabet } from '../machine';
import { useMachine } from '../store';
import { usePhysicalKeyboard } from '../useKeys';
import { useCheckKeys } from './checkKeys';
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
  /** The drum body as a cable-style socket: picked up or clicked to take the drum out. */
  socket: string;
  onGrab: (id: string, event: ReactPointerEvent<SVGGElement>) => void;
  onActivate: (id: string) => void;
}

/**
 * A checking machine drum: the letters round its face, the window letter at the index mark on top, and its coloured
 * ring with a black dot at the ring letter. Dragging the ring (or Arrow Up/Down on it) sets the ring; the thumbwheel
 * turns the drum, ring and all.
 */
function CheckDrum({ x, rotor, window, ring, slot, onTurn, onTurnRing, socket, onGrab, onActivate }: CheckDrumProps) {
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
      <g
        className="drum-body"
        role="button"
        tabIndex={0}
        aria-label={`Take the ${slot} drum ${rotor} out`}
        data-socket={socket}
        onPointerDown={(event) => onGrab(socket, event)}
        onKeyDown={(event) => {
          if (['Enter', ' ', 'Delete', 'Backspace'].includes(event.key)) {
            event.preventDefault();
            onActivate(socket);
          }
        }}
      >
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
      </g>
      <text className="drum-name" x={x} y={wheelY + drumRadius + 20}>
        {rotor}
      </text>
      <Thumbwheel slot={slot} disabled={false} x={x + drumRadius + 22} y={wheelY} onTurn={onTurn} />
    </g>
  );
}


const slotId = (drum: number) => `slot-${drum}`;
const rackId = (rotor: string) => `rack-${rotor}`;
const slotOf = (id: string | null) => (id?.startsWith('slot-') ? Number(id.slice(5)) : null);
const rackRotorOf = (id: string | null) => (id?.startsWith('rack-') ? id.slice(5) : null);

/**
 * The Hut 8 checking machine: a reflector wheel and three drums with Bombe drum letters and a ring each, without
 * plugboard or stepping, with the spare drums in the rack above, a row of 26 lamps and a row of 26 keys. Drums are
 * fitted like plugboard cables: drag one from the rack to a place, or pick it and then the place; a click on a fitted
 * drum, or dragging it off, puts it back. The drums turn by thumbwheel and the rings by dragging; a key, clicked or
 * typed, lights the lamp its letter goes to once all three drums are fitted.
 */
export function CheckingMachine() {
  const checker = useMachine((store) => store.bombe?.checker);
  const lamp = useMachine((store) => store.checkLamp);
  const setChecker = useMachine((store) => store.setChecker);
  const stepCheckDrum = useMachine((store) => store.stepCheckDrum);
  const stepCheckRing = useMachine((store) => store.stepCheckRing);
  const [picked, setPicked] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const keys = useCheckKeys();
  const down = useMachine((store) => store.checkKey);
  usePhysicalKeyboard(keys);

  const drums = checker?.drums ?? [null, null, null];
  const fit = (drum: number, rotor: string | null) => {
    const next = drums.map((own) => (own === rotor ? null : own));
    next[drum] = rotor;
    void setChecker({ drums: next });
  };

  const activate = (id: string) => {
    const rotor = rackRotorOf(id);
    const drum = slotOf(id);
    if (rotor) {
      setPicked(picked === rotor ? null : rotor);
    } else if (drum !== null && picked) {
      setPicked(null);
      fit(drum, picked);
    } else if (drum !== null && drums[drum]) {
      fit(drum, null);
    }
  };

  const drop = (from: string, to: string | null) => {
    setPicked(null);
    const source = slotOf(from);
    const rotor = rackRotorOf(from) ?? (source !== null ? drums[source] : null);
    const target = slotOf(to);
    if (rotor && target !== null && target !== source) {
      fit(target, rotor);
    } else if (source !== null && to === null) {
      fit(source, null);
    }
  };

  const { drag, grab } = usePlugDrag(svg, activate, drop);

  if (!checker) {
    return null;
  }
  const rackLeft = width / 2 - ((rotors.length - 1) * rackPitch) / 2;
  const held = drag?.point ? (rackRotorOf(drag.from) ?? (slotOf(drag.from) !== null ? drums[slotOf(drag.from)!] : null)) : null;

  return (
    <svg ref={svg} className="checking-machine" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Checking machine" onKeyDown={(event) => event.key === 'Escape' && setPicked(null)}>
      <rect className="panel" x={4} y={4} width={width - 8} height={height - 8} rx={16} />
      <g className="drum-rack" role="group" aria-label="Drum rack">
        <rect x={rackLeft - 44} y={rackY - 34} width={(rotors.length - 1) * rackPitch + 88} height={68} rx={8} />
        {rotors.map((rotor, index) => {
          const inUse = drums.includes(rotor);
          return (
            <g
              key={rotor}
              className={['rack-drum', inUse ? 'in-use' : '', !inUse && lightDrums.has(rotor) ? 'light' : '', picked === rotor ? 'selected' : ''].filter(Boolean).join(' ')}
              role="button"
              tabIndex={inUse ? undefined : 0}
              aria-label={`Drum ${rotor}${inUse ? ', fitted' : ''}`}
              aria-pressed={picked === rotor}
              aria-disabled={inUse || undefined}
              data-socket={inUse ? undefined : rackId(rotor)}
              onPointerDown={inUse ? undefined : (event) => grab(rackId(rotor), event)}
              onKeyDown={(event) => {
                if (!inUse && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault();
                  activate(rackId(rotor));
                }
              }}
            >
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
        <text x={wheelX[0]} y={wheelY} role="img" aria-label={`Reflector ${checker.reflector}`}>
          {checker.reflector}
        </text>
      </g>
      {drums.map((rotor, drum) =>
        rotor && !(drag?.point && drag.from === slotId(drum)) ? (
          <CheckDrum
            key={slots[drum]}
            x={wheelX[drum + 1]}
            rotor={rotor}
            window={checker.windows[drum]}
            ring={checker.rings[drum]}
            slot={slots[drum]}
            socket={slotId(drum)}
            onGrab={grab}
            onActivate={activate}
            onTurn={(steps) => void stepCheckDrum(drum, steps)}
            onTurnRing={(steps) => void stepCheckRing(drum, steps)}
          />
        ) : (
          <g
            key={slots[drum]}
            className={picked ? 'drum-place ready' : 'drum-place'}
            role="button"
            tabIndex={0}
            aria-label={`${slots[drum]} drum place, empty`}
            data-socket={slotId(drum)}
            onPointerDown={(event) => grab(slotId(drum), event)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                activate(slotId(drum));
              }
            }}
          >
            <circle cx={wheelX[drum + 1]} cy={wheelY} r={drumRadius} />
          </g>
        ),
      )}
      {[...alphabet].map((letter, index) => (
        <Lamp key={letter} letter={letter} lit={lamp === letter} x={margin + pitch / 2 + index * pitch} y={lampY} />
      ))}
      {[...alphabet].map((letter, index) => (
        <Key key={letter} letter={letter} down={down === letter} x={margin + pitch / 2 + index * pitch} y={keyY} keys={keys} />
      ))}
      {held && drag?.point && <circle className="held-drum" cx={drag.point.x} cy={drag.point.y} r={drumRadius / 2} style={{ fill: drumColours[held] }} aria-hidden="true" />}
    </svg>
  );
}
