import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { BombeMachine, BombeState } from '../api';
import { usePlugDrag, type Point } from '../components/usePlugDrag';
import { alphabet, shiftLetter } from '../machine';
import { useMachine } from '../store';
import { LetterDial, ToggleSwitch } from './controls';
import { chainLength, chainNames, groupsOf } from './drums';
import { isActive } from './FrontView';

const margin = 16;
const headerHeight = 0;
const groupWidth = 290;
const groupGap = 76;
const letterPitch = 22;
const plateTop = margin + headerHeight;
const stripTop = plateTop + 44;
const stripHeight = alphabet.length * letterPitch;
const scramblerPitch = stripHeight / chainLength;
const footTop = stripTop + stripHeight + 12;
const footHeight = 100;
const width = 2 * margin + 3 * groupWidth + 2 * groupGap;
const height = footTop + footHeight + margin;

/** A socket on the back: a letter's common, a scrambler's jack (0 or 1) or a test register, of a chain. */
type Socket = { kind: 'common'; chain: number; letter: string } | { kind: 'jack'; chain: number; scrambler: number; jack: number } | { kind: 'register'; chain: number };

const socketId = (socket: Socket) =>
  socket.kind === 'common' ? `common-${socket.chain}-${socket.letter}` : socket.kind === 'jack' ? `jack-${socket.chain}-${socket.scrambler}-${socket.jack}` : `register-${socket.chain}`;

function socketOf(id: string | null): Socket | null {
  const [kind, chain, a, b] = id?.split('-') ?? [];
  switch (kind) {
    case 'common':
      return { kind, chain: Number(chain), letter: a };
    case 'jack':
      return { kind, chain: Number(chain), scrambler: Number(a), jack: Number(b) };
    case 'register':
      return { kind, chain: Number(chain) };
    default:
      return null;
  }
}

const groupLeft = (chain: number) => margin + chain * (groupWidth + groupGap);
const commonX = (chain: number) => groupLeft(chain) + 64;
const jacksX = (chain: number) => groupLeft(chain) + groupWidth - 64;
const scramblerY = (scrambler: number) => stripTop + scrambler * scramblerPitch + scramblerPitch / 2;
const footY = footTop + 40;

/** Where a socket sits on the back. */
function pointOf(socket: Socket): Point {
  switch (socket.kind) {
    case 'common':
      return { x: commonX(socket.chain), y: stripTop + (socket.letter.charCodeAt(0) - 65) * letterPitch + letterPitch / 2 };
    case 'jack':
      return { x: jacksX(socket.chain) + (socket.jack === 0 ? -15 : 15), y: scramblerY(socket.scrambler) };
    case 'register':
      return { x: groupLeft(socket.chain) + 64, y: footY };
  }
}

/** The letter a jack or test register is plugged onto, or null. */
function pluggedTo(machine: BombeMachine, socket: Socket): string | null {
  const chain = machine.chains[socket.chain];
  return socket.kind === 'jack' ? chain.scramblers[socket.scrambler].jacks[socket.jack] : socket.kind === 'register' ? chain.testRegister : null;
}

/** A cable from a jack at `from` to a common at `to`, hanging between the strips. */
function cablePath(from: Point, to: Point): string {
  const sag = 16 + Math.abs(from.y - to.y) / 4;
  return `M${from.x},${from.y} C${from.x - 30},${from.y + sag} ${to.x + 30},${to.y + sag} ${to.x},${to.y}`;
}

/** The test register cable: up from the foot of the chain to its common, clear of the letters. */
function registerPath(from: Point, to: Point): string {
  return `M${from.x},${from.y} C${from.x + 70},${from.y - 40} ${to.x + 70},${to.y + 20} ${to.x},${to.y}`;
}

/** A heavy 26-way cable with a plug at each end. */
function Cable({ d, from, to, className = 'cable' }: { d: string; from: Point; to: Point; className?: string }) {
  return (
    <g className={className}>
      <path className="cable-sheath" d={d} />
      <path className="cable-core" d={d} />
      <circle className="plug" cx={from.x} cy={from.y} r={6} />
      <circle className="plug" cx={to.x} cy={to.y} r={6} />
    </g>
  );
}

interface SocketProps {
  socket: Socket;
  label: string;
  selected: boolean;
  disabled: boolean;
  onActivate: (id: string) => void;
  onGrab: (id: string, event: PointerEvent<SVGGElement>) => void;
}

/** A 26-way socket to plug a cable into: Enter or Space picks it as a cable end, or pulls out the cable plugged into it. */
function Jack({ socket, label, selected, disabled, onActivate, onGrab }: SocketProps) {
  const id = socketId(socket);
  const { x, y } = pointOf(socket);
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(id);
    }
  };
  return (
    <g
      className={selected ? 'jack selected' : 'jack'}
      role="button"
      tabIndex={disabled ? undefined : 0}
      aria-label={label}
      aria-pressed={selected}
      aria-disabled={disabled || undefined}
      data-socket={disabled ? undefined : id}
      onKeyDown={disabled ? undefined : onKeyDown}
      onPointerDown={disabled ? undefined : (event) => onGrab(id, event)}
    >
      <circle className="jack-area" cx={x} cy={y} r={11} />
      <circle className="jack-ring" cx={x} cy={y} r={8} />
      <circle className="jack-hole" cx={x} cy={y} r={5} />
      <rect className="jack-key" x={x - 1.5} y={y - 8} width={3} height={3} />
    </g>
  );
}

/**
 * The back of the Bombe: a group of socket strips for each chain, with the commons (one per letter) on the left, the two
 * jacks of each of its 12 scramblers on the right, and its test register and input wire at the foot. The join switches
 * stand between the groups. Cables go from jacks and test registers to
 * commons: drag one end onto the other, or pick the two ends in turn. A click on a plugged jack pulls its cable out;
 * dragging its end moves it, or pulls it out off the commons.
 */
function Back({ bombe }: { bombe: BombeState }) {
  const plugJack = useMachine((store) => store.plugJack);
  const setTestRegister = useMachine((store) => store.setTestRegister);
  const joinChains = useMachine((store) => store.joinChains);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const svg = useRef<SVGSVGElement>(null);
  const { machine } = bombe;
  const locked = isActive(bombe.run);
  const switchesLocked = locked || busy;
  const board = bombe.settings.diagonalBoard;
  const joinedIn = (chain: number) => chain > 0 && machine.joins[chain - 1];

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  const plug = (end: Socket, letter: string | null) => {
    if (end.kind === 'jack') {
      void plugJack(end.chain, end.scrambler, end.jack, letter);
    } else if (end.kind === 'register') {
      void setTestRegister(end.chain, { letter: letter ?? '' });
    }
  };

  /** A common and a cable end of the same chain, in either order, or null. */
  const pair = (a: Socket, b: Socket): [Socket, string] | null => {
    if (a.chain !== b.chain) {
      return null;
    }
    if (a.kind === 'common' && b.kind !== 'common') {
      return [b, a.letter];
    }
    return b.kind === 'common' && a.kind !== 'common' ? [a, b.letter] : null;
  };

  const activate = (id: string) => {
    const socket = socketOf(id)!;
    const first = socketOf(selected);
    const joined = first && pair(first, socket);
    if (joined) {
      setSelected(null);
      plug(...joined);
    } else if (socket.kind !== 'common' && pluggedTo(machine, socket)) {
      setSelected(null);
      plug(socket, null);
    } else {
      setSelected(selected === id ? null : id);
    }
  };

  const drop = (from: string, to: string | null) => {
    setSelected(null);
    const start = socketOf(from)!;
    const end = socketOf(to);
    const joined = end && pair(start, end);
    if (joined) {
      plug(...joined);
    } else if (!end && start.kind !== 'common' && pluggedTo(machine, start)) {
      plug(start, null);
    }
  };

  const { drag, grab } = usePlugDrag(svg, activate, drop);
  const dragged = drag?.point ? socketOf(drag.from) : null;

  const cables = machine.chains.flatMap((chain, index): { end: Socket; letter: string }[] => [
    ...chain.scramblers.flatMap((scrambler, s) =>
      scrambler.jacks.flatMap((letter, jack) => (letter ? [{ end: { kind: 'jack' as const, chain: index, scrambler: s, jack }, letter }] : [])),
    ),
    ...(chain.testRegister ? [{ end: { kind: 'register' as const, chain: index }, letter: chain.testRegister }] : []),
  ]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setSelected(null);
    }
  };

  return (
    <svg ref={svg} className="bombe-back" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Back of the Bombe" onKeyDown={onKeyDown}>
      <rect className="cabinet" x={4} y={4} width={width - 8} height={height - 8} rx={6} />
      {machine.chains.map((chain, index) => {
        const left = groupLeft(index);
        const group = groupsOf(machine).find((chains) => chains.includes(index))!;
        return (
          <g key={index} className="chain-panel" role="group" aria-label={`Chain ${index + 1}`}>
            <rect className="label-plate" x={left} y={plateTop} width={groupWidth} height={20} rx={2} />
            <text className="panel-label" x={left + 8} y={plateTop + 10}>
              Chain {index + 1}
              {joinedIn(index) ? ` · joined to chain ${index}` : group.length > 1 ? ` · joined to ${chainNames(group.slice(1)).toLowerCase()}` : ''}
            </text>
            <text className="engraving" x={commonX(index)} y={plateTop + 34}>
              {board && !joinedIn(index) ? 'COMMONS · BOARD' : 'COMMONS'}
            </text>
            <text className="engraving" x={jacksX(index)} y={plateTop + 34}>
              SCRAMBLERS
            </text>
            <rect className={board ? 'strip board' : 'strip'} x={commonX(index) - 44} y={stripTop - 4} width={64} height={stripHeight + 8} rx={3} />
            <rect className="strip" x={jacksX(index) - 32} y={stripTop - 4} width={96} height={stripHeight + 8} rx={3} />
            {[...alphabet].map((letter) => {
              const socket: Socket = { kind: 'common', chain: index, letter };
              const { y } = pointOf(socket);
              return (
                <g key={letter} className="common">
                  <text x={commonX(index) - 26} y={y}>
                    {letter}
                  </text>
                  <Jack socket={socket} label={`Chain ${index + 1} common ${letter}`} selected={selected === socketId(socket)} disabled={locked} onActivate={activate} onGrab={grab} />
                </g>
              );
            })}
            {chain.scramblers.map((scrambler, s) => (
              <g key={s} className="scrambler-jacks">
                <text x={jacksX(index) + 44} y={scramblerY(s)}>
                  {s + 1}
                </text>
                {[0, 1].map((jack) => {
                  const socket: Socket = { kind: 'jack', chain: index, scrambler: s, jack };
                  const letter = scrambler.jacks[jack];
                  return (
                    <Jack
                      key={jack}
                      socket={socket}
                      label={`Chain ${index + 1} scrambler ${s + 1} jack ${jack + 1}${letter ? `, plugged to ${letter}` : ''}`}
                      selected={selected === socketId(socket)}
                      disabled={locked}
                      onActivate={activate}
                      onGrab={grab}
                    />
                  );
                })}
              </g>
            ))}
            <g className="chain-foot">
              <rect className="strip" x={left} y={footTop} width={groupWidth} height={footHeight - 12} rx={3} />
              <text className="engraving" x={left + 64} y={footY + 30}>
                TEST REGISTER
              </text>
              {joinedIn(index) ? (
                <text className="engraving" x={left + 64} y={footY}>
                  CHAIN {index}
                </text>
              ) : (
                <>
                  <Jack
                    socket={{ kind: 'register', chain: index }}
                    label={`Chain ${index + 1} test register${chain.testRegister ? `, plugged to ${chain.testRegister}` : ''}`}
                    selected={selected === `register-${index}`}
                    disabled={locked}
                    onActivate={activate}
                    onGrab={grab}
                  />
                  <LetterDial
                    label={`Chain ${index + 1} input wire`}
                    x={left + groupWidth - 64}
                    y={footY - 4}
                    letter={chain.input}
                    disabled={switchesLocked}
                    onTurn={(steps) => send(setTestRegister(index, { input: shiftLetter(chain.input, steps) }))}
                  />
                  <text className="engraving" x={left + groupWidth - 64} y={footY + 30}>
                    INPUT WIRE
                  </text>
                </>
              )}
            </g>
          </g>
        );
      })}
      {machine.joins.map((joined, join) => (
        <ToggleSwitch
          key={join}
          label={`Join chains ${join + 1}–${join + 2}`}
          caption="Join"
          x={groupLeft(join + 1) - groupGap / 2 - 10}
          y={footY - 6}
          on={joined}
          disabled={switchesLocked}
          onToggle={(on) => send(joinChains(join, on))}
        />
      ))}
      <g className="cables" aria-hidden="true">
        {cables
          .filter(({ end }) => !(dragged && socketId(dragged) === socketId(end)))
          .map(({ end, letter }) => {
            const from = pointOf(end);
            const to = pointOf({ kind: 'common', chain: end.chain, letter });
            return <Cable key={socketId(end)} d={end.kind === 'register' ? registerPath(from, to) : cablePath(from, to)} from={from} to={to} />;
          })}
        {machine.joins.map((joined, join) => {
          if (!joined) {
            return null;
          }
          const from = { x: groupLeft(join) + groupWidth - 12, y: footTop + 14 };
          const to = { x: groupLeft(join + 1) + 12, y: footTop + 14 };
          return <Cable key={join} className="cable join" d={`M${from.x},${from.y} C${from.x + 24},${from.y - 30} ${to.x - 24},${to.y - 30} ${to.x},${to.y}`} from={from} to={to} />;
        })}
        {dragged && drag?.point && <Cable className="cable held" d={cablePath(pointOf(dragged), drag.point)} from={pointOf(dragged)} to={drag.point} />}
      </g>
    </svg>
  );
}

/** The back of the Bombe: the cables, the test registers and input wires, and the join switches. */
export function BackView() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe) {
    return null;
  }

  return (
    <div className="bombe-view back-view">
      <p className="summary">
        Cable each scrambler's two jacks to the commons of its letters, and the test register to the common it watches: drag one end onto the other, or
        click them in turn. Click a plugged jack to pull its cable out. The switches join the chains; the input wire turns with
        its arrows or Arrow Up/Down.
      </p>
      <Back bombe={bombe} />
    </div>
  );
}
