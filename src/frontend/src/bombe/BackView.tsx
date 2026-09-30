import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { BombeMachine, BombeState } from '../api';
import { usePlugDrag, type Point } from '../components/usePlugDrag';
import { alphabet } from '../machine';
import { useMachine } from '../store';
import { chainLength, chainNames, groupsOf } from './drums';
import { isActive } from './FrontView';

const margin = 24;
const commonPitch = 27;
const commonsY = 56;
const jacksY = 150;
const panelHeight = 200;
const scramblerPitch = (alphabet.length * commonPitch) / chainLength;
const registerX = 2 * margin + alphabet.length * commonPitch + 40;
const width = registerX + 90;
const height = 3 * panelHeight + margin;

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

const panelTop = (chain: number) => margin + chain * panelHeight;
const commonX = (letter: string) => margin + (letter.charCodeAt(0) - 65) * commonPitch + commonPitch / 2;
const jackX = (scrambler: number, jack: number) => margin + scrambler * scramblerPitch + scramblerPitch / 2 + (jack === 0 ? -8 : 8);

/** Where a socket sits on the back. */
function pointOf(socket: Socket): Point {
  const top = panelTop(socket.chain);
  switch (socket.kind) {
    case 'common':
      return { x: commonX(socket.letter), y: top + commonsY };
    case 'jack':
      return { x: jackX(socket.scrambler, socket.jack), y: top + jacksY };
    case 'register':
      return { x: registerX, y: top + commonsY };
  }
}

/** The letter a jack or test register is plugged onto, or null. */
function pluggedTo(machine: BombeMachine, socket: Socket): string | null {
  const chain = machine.chains[socket.chain];
  return socket.kind === 'jack' ? chain.scramblers[socket.scrambler].jacks[socket.jack] : socket.kind === 'register' ? chain.testRegister : null;
}

/** A cable from a jack or test register at `from` to a common at `to`. */
function cablePath(from: Point, to: Point): string {
  const bend = Math.max(30, Math.abs(from.y - to.y) / 2);
  return `M${from.x},${from.y} C${from.x},${from.y - Math.sign(from.y - to.y || 1) * bend} ${to.x},${to.y + Math.sign(from.y - to.y || 1) * bend} ${to.x},${to.y}`;
}

/** The test register cable: it dips below the commons, clear of their letters, to its common. */
function registerPath(from: Point, to: Point): string {
  return `M${from.x},${from.y} C${from.x},${from.y + 50} ${to.x},${to.y + 50} ${to.x},${to.y}`;
}

interface SocketProps {
  socket: Socket;
  label: string;
  selected: boolean;
  disabled: boolean;
  onActivate: (id: string) => void;
  onGrab: (id: string, event: PointerEvent<SVGGElement>) => void;
  r?: number;
}

/** A jack to plug a cable into: Enter or Space picks it as a cable end, or pulls out the cable plugged into it. */
function Jack({ socket, label, selected, disabled, onActivate, onGrab, r = 7 }: SocketProps) {
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
      <circle cx={x} cy={y} r={r + 5} className="jack-area" />
      <circle cx={x} cy={y} r={r} />
    </g>
  );
}

/**
 * The back of the Bombe: for each chain, the commons (one per letter), the two jacks of each of its 12 scramblers and
 * its test register. Cables go from jacks and test registers to commons: drag one end onto the other, or pick the two
 * ends in turn. A click on a plugged jack pulls its cable out; dragging its end moves it, or pulls it out off the
 * commons.
 */
function Back({ bombe }: { bombe: BombeState }) {
  const plugJack = useMachine((store) => store.plugJack);
  const setTestRegister = useMachine((store) => store.setTestRegister);
  const [selected, setSelected] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { machine } = bombe;
  const locked = isActive(bombe.run);
  const board = bombe.settings.diagonalBoard;
  const joinedIn = (chain: number) => chain > 0 && machine.joins[chain - 1];

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
      {machine.chains.map((chain, index) => {
        const top = panelTop(index);
        const group = groupsOf(machine).find((chains) => chains.includes(index))!;
        return (
          <g key={index} className="chain-panel" role="group" aria-label={`Chain ${index + 1}`}>
            <rect className="panel" x={margin / 2} y={top} width={width - margin} height={panelHeight - 12} rx={6} />
            <text className="panel-label" x={margin} y={top + 14}>
              Chain {index + 1}
              {joinedIn(index) ? ` · joined to chain ${index}` : group.length > 1 ? ` · joined to ${chainNames(group.slice(1)).toLowerCase()}` : ''}
              {!joinedIn(index) ? ` · diagonal board ${board ? 'on' : 'off'}` : ''}
            </text>
            <line className={board ? 'board-bar' : 'board-bar off'} x1={margin} y1={top + commonsY - 34} x2={margin + alphabet.length * commonPitch} y2={top + commonsY - 34} />
            {[...alphabet].map((letter) => {
              const socket: Socket = { kind: 'common', chain: index, letter };
              return (
                <g key={letter} className="common">
                  <Jack
                    socket={socket}
                    label={`Chain ${index + 1} common ${letter}`}
                    selected={selected === socketId(socket)}
                    disabled={locked}
                    onActivate={activate}
                    onGrab={grab}
                    r={8}
                  />
                  <text x={commonX(letter)} y={top + commonsY - 17}>
                    {letter}
                  </text>
                </g>
              );
            })}
            {chain.scramblers.map((scrambler, s) => {
              const x = margin + s * scramblerPitch + scramblerPitch / 2;
              return (
                <g key={s} className="scrambler-jacks">
                  <rect x={x - 19} y={top + jacksY - 12} width={38} height={36} rx={3} />
                  <text x={x} y={top + jacksY + 17}>
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
                        r={5}
                      />
                    );
                  })}
                </g>
              );
            })}
            <g className="test-register">
              <rect x={registerX - 30} y={top + 24} width={100} height={52} rx={4} />
              <text className="panel-label" x={registerX - 24} y={top + 34}>
                Test register
              </text>
              {joinedIn(index) ? (
                <text x={registerX + 20} y={top + commonsY + 14}>
                  chain {index}
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
                  <text x={registerX + 35} y={top + commonsY + 4}>
                    {chain.testRegister ? `${chain.testRegister} · ${chain.input}` : '—'}
                  </text>
                </>
              )}
            </g>
          </g>
        );
      })}
      <g className="cables" aria-hidden="true">
        {cables
          .filter(({ end }) => !(dragged && socketId(dragged) === socketId(end)))
          .map(({ end, letter }) => (
            <path key={socketId(end)} className="cable" d={end.kind === 'register' ? registerPath(pointOf(end), pointOf({ kind: 'common', chain: end.chain, letter })) : cablePath(pointOf(end), pointOf({ kind: 'common', chain: end.chain, letter }))} />
          ))}
        {machine.joins.map(
          (joined, join) =>
            joined && (
              <path
                key={join}
                className="cable join"
                d={`M${width - margin},${panelTop(join) + commonsY} C${width},${panelTop(join) + panelHeight / 2} ${width},${panelTop(join + 1)} ${width - margin},${panelTop(join + 1) + commonsY}`}
              />
            ),
        )}
        {dragged && drag?.point && <path className="cable held" d={cablePath(pointOf(dragged), drag.point)} />}
      </g>
    </svg>
  );
}

/** A chain group's test register input wire: the guessed stecker partner of the test register letter. */
function InputWire({ bombe, chain, disabled, send }: { bombe: BombeState; chain: number; disabled: boolean; send: (change: Promise<boolean>) => void }) {
  const setTestRegister = useMachine((store) => store.setTestRegister);
  const { input } = bombe.machine.chains[chain];
  return (
    <label>
      Chain {chain + 1} input wire{' '}
      <select value={input} disabled={disabled} onChange={(event) => send(setTestRegister(chain, { input: event.target.value }))}>
        {[...alphabet].map((letter) => (
          <option key={letter}>{letter}</option>
        ))}
      </select>

    </label>
  );
}

/** The back of the Bombe: the cables, the join cables between chains, the diagonal board switch and the input wires. */
export function BackView() {
  const bombe = useMachine((store) => store.bombe);
  const configureBombe = useMachine((store) => store.configureBombe);
  const joinChains = useMachine((store) => store.joinChains);
  const [busy, setBusy] = useState(false);
  if (!bombe) {
    return null;
  }
  const disabled = busy || isActive(bombe.run);
  const groups = groupsOf(bombe.machine);

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  return (
    <div className="bombe-view back-view">
      <div className="crib-controls">
        <label>
          <input
            type="checkbox"
            checked={bombe.settings.diagonalBoard}
            disabled={disabled}
            onChange={(event) => send(configureBombe({ diagonalBoard: event.target.checked }))}
          />
          Diagonal board
        </label>
        {bombe.machine.joins.map((joined, join) => (
          <label key={join}>
            <input type="checkbox" checked={joined} disabled={disabled} onChange={(event) => send(joinChains(join, event.target.checked))} />
            Join chains {join + 1}–{join + 2}
          </label>
        ))}
      </div>
      <div className="crib-controls">
        {groups.map((chains) => (
          <InputWire key={chains[0]} bombe={bombe} chain={chains[0]} disabled={disabled} send={send} />
        ))}
      </div>
      <p className="summary">
        Cable each scrambler's two jacks to the commons of its letters, and the test register to the common it watches: drag one end onto the other, or
        click them in turn. Click a plugged jack to pull its cable out.
      </p>
      <Back bombe={bombe} />
    </div>
  );
}
