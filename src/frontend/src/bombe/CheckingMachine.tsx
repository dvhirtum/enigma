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

const dummy = 'Dummy';
const dummyColour = '#efe6cf';
const reflectors = ['B', 'C', 'B-thin', 'C-thin'];
const reflectorName = (reflector: string) => reflector.replace('-', ' ');
const cartridgeWidth = 64;
const cartridgeHeight = 34;
const cartridgePitch = 76;
const cartridgeLeft = width - margin - 3 * cartridgePitch - cartridgeWidth / 2 - 20;
const slotX = margin + 90;

/** Something to fit: a rotor drum, the dummy drum or a reflector cartridge. */
type Part = { kind: 'drum'; rotor: string } | { kind: 'dummy' } | { kind: 'reflector'; reflector: string };
/** A place on the machine: a drum place (0 = left), the dummy drum place or the reflector slot. */
type Place = { kind: 'drum'; drum: number } | { kind: 'dummy' } | { kind: 'reflector' };

const slotId = (drum: number) => `slot-${drum}`;
const dummySlot = 'slot-dummy';
const reflectorSlot = 'slot-reflector';
const rackId = (rotor: string) => `rack-${rotor}`;
const cartridgeId = (reflector: string) => `cartridge-${reflector}`;

/** The place a socket stands for, or null for a rack socket. */
function placeOf(id: string | null): Place | null {
  if (id === dummySlot) {
    return { kind: 'dummy' };
  }
  if (id === reflectorSlot) {
    return { kind: 'reflector' };
  }
  return id?.startsWith('slot-') ? { kind: 'drum', drum: Number(id.slice(5)) } : null;
}

/** The part in a rack at a socket, or null. */
function rackPartOf(id: string | null): Part | null {
  if (id?.startsWith('cartridge-')) {
    return { kind: 'reflector', reflector: id.slice(10) };
  }
  if (id === rackId(dummy)) {
    return { kind: 'dummy' };
  }
  return id?.startsWith('rack-') ? { kind: 'drum', rotor: id.slice(5) } : null;
}

/**
 * The Hut 8 checking machine: a reflector cartridge in the slot on its side, the dummy drum in the left drum place, and
 * three drums with Bombe drum letters and a ring each, without plugboard or stepping, with the spare drums and
 * cartridges in the racks above, a row of 26 lamps and a row of 26 keys. Drums and cartridges are fitted like plugboard
 * cables: drag one from its rack to its place, or pick it and then the place; a click on a fitted one, or dragging it
 * off, puts it back. The drums turn by thumbwheel and the rings by dragging; a key, clicked or typed, lights the lamp
 * its letter goes to once the reflector, the dummy and all three drums are fitted.
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
  const reflector = checker?.reflector ?? null;
  const dummyFitted = checker?.dummy ?? false;

  /** The part fitted at a place's socket, or in a rack at its socket. */
  const partOf = (id: string | null): Part | null => {
    const place = placeOf(id);
    if (!place) {
      return rackPartOf(id);
    }
    if (place.kind === 'drum') {
      const rotor = drums[place.drum];
      return rotor ? { kind: 'drum', rotor } : null;
    }
    if (place.kind === 'dummy') {
      return dummyFitted ? { kind: 'dummy' } : null;
    }
    return reflector ? { kind: 'reflector', reflector } : null;
  };

  /** Fits a part to a place of its kind; a drum fitted elsewhere moves. */
  const fit = (part: Part, place: Place) => {
    if (part.kind === 'drum' && place.kind === 'drum') {
      const next = drums.map((own) => (own === part.rotor ? null : own));
      next[place.drum] = part.rotor;
      void setChecker({ drums: next });
    } else if (part.kind === 'dummy' && place.kind === 'dummy') {
      void setChecker({ dummy: true });
    } else if (part.kind === 'reflector' && place.kind === 'reflector') {
      void setChecker({ reflector: part.reflector });
    }
  };

  /** Puts the part at a place back in its rack. */
  const empty = (place: Place) => {
    if (place.kind === 'drum') {
      void setChecker({ drums: drums.map((own, drum) => (drum === place.drum ? null : own)) });
    } else if (place.kind === 'dummy') {
      void setChecker({ dummy: false });
    } else {
      void setChecker({ reflector: '' });
    }
  };

  const activate = (id: string) => {
    const place = placeOf(id);
    const pickedPart = rackPartOf(picked);
    if (!place) {
      setPicked(picked === id ? null : id);
    } else if (pickedPart?.kind === place.kind) {
      setPicked(null);
      fit(pickedPart, place);
    } else if (partOf(id)) {
      empty(place);
    }
  };

  const drop = (from: string, to: string | null) => {
    setPicked(null);
    const part = partOf(from);
    const source = placeOf(from);
    const target = placeOf(to);
    if (part && target && to !== from) {
      fit(part, target);
    } else if (source && to === null) {
      empty(source);
    }
  };

  const { drag, grab } = usePlugDrag(svg, activate, drop);

  if (!checker) {
    return null;
  }
  const rackDrums = [...rotors, dummy];
  const rackLeft = width / 2 - 120 - ((rackDrums.length - 1) * rackPitch) / 2;
  const held = drag?.point ? partOf(drag.from) : null;
  const dragging = (id: string) => Boolean(drag?.point) && drag?.from === id;
  const placeClass = (kind: Place['kind']) => (rackPartOf(picked)?.kind === kind ? 'drum-place ready' : 'drum-place');
  const onKeys =
    (id: string, keyNames = ['Enter', ' ']) =>
    (event: KeyboardEvent) => {
      if (keyNames.includes(event.key)) {
        event.preventDefault();
        activate(id);
      }
    };
  const takeOutKeys = ['Enter', ' ', 'Delete', 'Backspace'];
  const slotRect = <rect x={slotX - cartridgeWidth} y={wheelY - cartridgeHeight / 2} width={cartridgeWidth * 2} height={cartridgeHeight} rx={4} />;

  return (
    <svg ref={svg} className="checking-machine" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Checking machine" onKeyDown={(event) => event.key === 'Escape' && setPicked(null)}>
      <rect className="panel" x={4} y={4} width={width - 8} height={height - 8} rx={16} />
      <g className="drum-rack" role="group" aria-label="Drum rack">
        <rect x={rackLeft - 44} y={rackY - 34} width={(rackDrums.length - 1) * rackPitch + 88} height={68} rx={8} />
        {rackDrums.map((rotor, index) => {
          const isDummy = rotor === dummy;
          const inUse = isDummy ? dummyFitted : drums.includes(rotor);
          const id = rackId(rotor);
          return (
            <g
              key={rotor}
              className={['rack-drum', inUse ? 'in-use' : '', !inUse && (isDummy || lightDrums.has(rotor)) ? 'light' : '', picked === id ? 'selected' : ''].filter(Boolean).join(' ')}
              role="button"
              tabIndex={inUse ? undefined : 0}
              aria-label={`${isDummy ? 'Dummy drum' : `Drum ${rotor}`}${inUse ? ', fitted' : ''}`}
              aria-pressed={picked === id}
              aria-disabled={inUse || undefined}
              data-socket={inUse ? undefined : id}
              onPointerDown={inUse ? undefined : (event) => grab(id, event)}
              onKeyDown={inUse ? undefined : onKeys(id)}
            >
              <circle cx={rackLeft + index * rackPitch} cy={rackY} r={24} style={inUse ? undefined : { fill: isDummy ? dummyColour : drumColours[rotor] }} />
              {!isDummy && (
                <text x={rackLeft + index * rackPitch} y={rackY}>
                  {rotor}
                </text>
              )}
            </g>
          );
        })}
      </g>
      <g className="cartridge-rack" role="group" aria-label="Reflector rack">
        <rect x={cartridgeLeft - cartridgeWidth / 2 - 12} y={rackY - 34} width={3 * cartridgePitch + cartridgeWidth + 24} height={68} rx={8} />
        {reflectors.map((own, index) => {
          const inUse = reflector === own;
          const id = cartridgeId(own);
          const x = cartridgeLeft + index * cartridgePitch;
          return (
            <g
              key={own}
              className={['cartridge', inUse ? 'in-use' : '', picked === id ? 'selected' : ''].filter(Boolean).join(' ')}
              role="button"
              tabIndex={inUse ? undefined : 0}
              aria-label={`Reflector ${reflectorName(own)}${inUse ? ', fitted' : ''}`}
              aria-pressed={picked === id}
              aria-disabled={inUse || undefined}
              data-socket={inUse ? undefined : id}
              onPointerDown={inUse ? undefined : (event) => grab(id, event)}
              onKeyDown={inUse ? undefined : onKeys(id)}
            >
              <rect x={x - cartridgeWidth / 2} y={rackY - cartridgeHeight / 2} width={cartridgeWidth} height={cartridgeHeight} rx={4} />
              {!inUse && (
                <text x={x} y={rackY}>
                  {reflectorName(own)}
                </text>
              )}
            </g>
          );
        })}
      </g>
      {reflector && !dragging(reflectorSlot) ? (
        <g
          className="cartridge fitted"
          role="button"
          tabIndex={0}
          aria-label={`Take reflector ${reflectorName(reflector)} out`}
          data-socket={reflectorSlot}
          onPointerDown={(event) => grab(reflectorSlot, event)}
          onKeyDown={onKeys(reflectorSlot, takeOutKeys)}
        >
          {slotRect}
          <text x={slotX} y={wheelY}>
            UKW {reflectorName(reflector)}
          </text>
        </g>
      ) : (
        <g
          className={placeClass('reflector')}
          role="button"
          tabIndex={0}
          aria-label="Reflector slot, empty"
          data-socket={reflectorSlot}
          onPointerDown={(event) => grab(reflectorSlot, event)}
          onKeyDown={onKeys(reflectorSlot)}
        >
          {slotRect}
        </g>
      )}
      {dummyFitted && !dragging(dummySlot) ? (
        <g
          className="dummy-drum"
          role="button"
          tabIndex={0}
          aria-label="Take the dummy drum out"
          data-socket={dummySlot}
          onPointerDown={(event) => grab(dummySlot, event)}
          onKeyDown={onKeys(dummySlot, takeOutKeys)}
        >
          <circle cx={wheelX[0]} cy={wheelY} r={drumRadius} />
          <circle className="hub" cx={wheelX[0]} cy={wheelY} r={drumRadius - ringWidth} />
        </g>
      ) : (
        <g
          className={placeClass('dummy')}
          role="button"
          tabIndex={0}
          aria-label="dummy drum place, empty"
          data-socket={dummySlot}
          onPointerDown={(event) => grab(dummySlot, event)}
          onKeyDown={onKeys(dummySlot)}
        >
          <circle cx={wheelX[0]} cy={wheelY} r={drumRadius} />
        </g>
      )}
      {drums.map((rotor, drum) =>
        rotor && !dragging(slotId(drum)) ? (
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
            className={placeClass('drum')}
            role="button"
            tabIndex={0}
            aria-label={`${slots[drum]} drum place, empty`}
            data-socket={slotId(drum)}
            onPointerDown={(event) => grab(slotId(drum), event)}
            onKeyDown={onKeys(slotId(drum))}
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
      {held && drag?.point &&
        (held.kind === 'reflector' ? (
          <rect className="held-cartridge" x={drag.point.x - cartridgeWidth / 2} y={drag.point.y - cartridgeHeight / 2} width={cartridgeWidth} height={cartridgeHeight} rx={4} aria-hidden="true" />
        ) : (
          <circle className="held-drum" cx={drag.point.x} cy={drag.point.y} r={drumRadius / 2} style={{ fill: held.kind === 'dummy' ? dummyColour : drumColours[held.rotor] }} aria-hidden="true" />
        ))}
    </svg>
  );
}
