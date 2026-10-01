import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { BombeMachine, BombeRun, BombeState } from '../api';
import { usePlugDrag } from '../components/usePlugDrag';
import { useWheelTurn } from '../components/useWheelTurn';
import { shiftLetter } from '../machine';
import { stopPage, useMachine } from '../store';
import { advanceBy, chainLength, chainNames, drumColours, groupsOf, indicatorOf, rotors, rowsOf, wiresOf } from './drums';

const banks = 3;
const pitch = 60;
const drumRadius = 22;
const drumPitch = 56;
const plateHeight = 24;
const bankHeight = plateHeight + 3 * drumPitch + 32;
const margin = 16;
const rackTop = margin;
const rackHeight = 60;
const cabinetTop = rackTop + rackHeight + 12;
const banksTop = cabinetTop + 16;
const banksLeft = margin + 20;
const indicatorLeft = banksLeft + chainLength * pitch + 16;
const indicatorWidth = 72;
const indicatorX = indicatorLeft + indicatorWidth / 2;
const cabinetRight = indicatorLeft + indicatorWidth + 12;
const width = cabinetRight + margin;
const height = banksTop + banks * bankHeight + 12 + margin;

export function isActive(run: BombeRun | null | undefined): boolean {
  return run?.status === 'Running' || run?.status === 'Paused';
}

const drumNames = ['upper', 'middle', 'lower'];
/** Drums light enough to need dark lettering. */
const lightDrums = new Set(['IV', 'VIII']);

/** A drum position on the machine: chain, scrambler (0 = the first of the chain) and row (0 = upper). */
interface Place {
  chain: number;
  scrambler: number;
  row: number;
}

const placeId = ({ chain, scrambler, row }: Place) => `drum-${chain}-${scrambler}-${row}`;
const rackId = (rotor: string) => `rack-${rotor}`;

function placeOf(id: string | null): Place | null {
  const match = id?.match(/^drum-(\d+)-(\d+)-(\d+)$/);
  return match ? { chain: Number(match[1]), scrambler: Number(match[2]), row: Number(match[3]) } : null;
}

const rotorOf = (id: string | null) => (id?.startsWith('rack-') ? id.slice(5) : null);

const ticks = Array.from({ length: 26 }, (_, tick) => (tick * 360) / 26);

interface DrumProps {
  x: number;
  y: number;
  letter: string;
  /** The rotor fitted, or null for an indicator drum. */
  rotor: string | null;
  label: string;
  /** No drum fitted here: the empty spindle. */
  empty?: boolean;
  /** Standing still while the Bombe runs: not all three drums are fitted. */
  idle?: boolean;
  selected?: boolean;
  /** The drop target for drums from the rack. */
  socket?: string;
  onTurn?: (steps: number) => void;
  onActivate?: () => void;
  onGrab?: (event: PointerEvent<SVGGElement>) => void;
}

/**
 * A drum: painted in its rotor's colour (cream for an indicator drum), with 26 marks round its face, and the letter
 * under the index mark above it. Without a drum, the bare spindle. The mouse wheel or Arrow Up/Down turn it; Enter or
 * Space fits the rotor picked in the rack, or takes the drum out.
 */
function Drum({ x, y, letter, rotor, label, empty = false, idle = false, selected = false, socket, onTurn, onActivate, onGrab }: DrumProps) {
  const wheel = useWheelTurn<SVGGElement>((steps) => onTurn?.(steps), !onTurn);
  const angle = ((letter.charCodeAt(0) - 65) * 360) / 26;
  const interactive = Boolean(onTurn ?? onActivate);
  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined && onTurn && !empty) {
      event.preventDefault();
      onTurn(steps);
    } else if ((event.key === 'Enter' || event.key === ' ') && onActivate) {
      event.preventDefault();
      onActivate();
    }
  };
  const classes = ['drum', empty ? 'empty' : '', rotor ? '' : 'indicator', rotor && lightDrums.has(rotor) ? 'light' : '', idle ? 'idle' : '', interactive ? 'settable' : '', selected ? 'selected' : ''];

  return (
    <g
      ref={wheel}
      className={classes.filter(Boolean).join(' ')}
      aria-label={label}
      role={interactive ? 'spinbutton' : 'img'}
      aria-valuetext={interactive ? letter : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-socket={socket}
      onKeyDown={interactive ? onKeyDown : undefined}
      onPointerDown={onGrab}
    >
      {empty ? (
        <>
          <circle className="socket" cx={x} cy={y} r={drumRadius} />
          <circle className="spindle" cx={x} cy={y} r={5} />
        </>
      ) : (
        <>
          <circle className="body" cx={x} cy={y} r={drumRadius} style={rotor ? { fill: drumColours[rotor] } : undefined} />
          <g transform={`rotate(${-angle} ${x} ${y})`}>
            <g className="ticks">
              {ticks.map((tick) => (
                <line key={tick} x1={x} y1={y - drumRadius + 1} x2={x} y2={y - drumRadius + (tick === 0 ? 6 : 4)} transform={`rotate(${tick} ${x} ${y})`} />
              ))}
            </g>
          </g>
          <circle className="hub" cx={x} cy={y + 10} r={4} />
          <text className="index-letter" x={x} y={y - 4}>
            {letter}
          </text>
        </>
      )}
      <path className="index-mark" d={`M ${x - 4} ${y - drumRadius - 6} L ${x + 4} ${y - drumRadius - 6} L ${x} ${y - drumRadius - 1} Z`} aria-hidden="true" />
    </g>
  );
}

const slotX = (scrambler: number) => banksLeft + scrambler * pitch + pitch / 2;
const bankTop = (chain: number) => banksTop + chain * bankHeight;
const chainTop = (chain: number) => bankTop(chain) + plateHeight;
const drumY = (chain: number, row: number) => chainTop(chain) + drumPitch / 2 + 4 + row * drumPitch;

/** A chain's label: its chains, joined or not, and the wheel order of its rows. */
function chainLabel(machine: BombeMachine, chain: number): string {
  const group = groupsOf(machine).find((chains) => chains.includes(chain))!;
  if (group[0] !== chain) {
    return `Chain ${chain + 1} · joined to chain ${chain}`;
  }
  const rows = rowsOf(machine, chain);
  const order = rows.every(Boolean) ? rows.join(' ') : rows.some(Boolean) ? 'drums missing' : 'no drums';
  return `${chainNames(group)} · ${order}`;
}

/**
 * The front of the Bombe: the drum rack on top, and in the cabinet three banks (chains) of twelve scramblers with
 * three drums each (upper, middle, lower), with the indicator drums right of the second bank. Before a run, drag a drum from the rack
 * onto a drum place, or pick it in the rack and then click the place: it fills that row of the chain from the first
 * scrambler up to the place. A click on a fitted drum, or dragging it off, takes it out; the mouse wheel or Arrow
 * Up/Down turn its letter.
 */
function Front({ bombe }: { bombe: BombeState }) {
  const fitRow = useMachine((store) => store.fitRow);
  const removeDrum = useMachine((store) => store.removeDrum);
  const turnScrambler = useMachine((store) => store.turnScrambler);
  const [picked, setPicked] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const { machine, run } = bombe;
  const active = isActive(run);
  const spinning = run?.status === 'Running' && run.speed === null;
  const position = !active ? 'ZZZ' : run?.pause ? run.pause.drumLetters : (run?.position ?? 'ZZZ');
  const indicator = indicatorOf(position);

  const rotorAt = ({ chain, scrambler, row }: Place) => machine.chains[chain].scramblers[scrambler].drums[row];

  const activate = (id: string) => {
    const rotor = rotorOf(id);
    const place = placeOf(id);
    if (rotor) {
      setPicked(picked === rotor ? null : rotor);
    } else if (place && picked) {
      setPicked(null);
      void fitRow(place.chain, place.row, place.scrambler, picked);
    } else if (place && rotorAt(place)) {
      void removeDrum(place.chain, place.scrambler, place.row);
    }
  };

  const drop = (from: string, to: string | null) => {
    setPicked(null);
    const source = placeOf(from);
    const rotor = rotorOf(from) ?? (source && rotorAt(source));
    const target = placeOf(to);
    if (target && rotor && to !== from) {
      void fitRow(target.chain, target.row, target.scrambler, rotor);
    } else if (source && rotorAt(source) && to === null) {
      void removeDrum(source.chain, source.scrambler, source.row);
    }
  };

  const { drag, grab } = usePlugDrag(svg, activate, drop);

  const turn = (place: Place, steps: number) => {
    const start = [...machine.chains[place.chain].scramblers[place.scrambler].start];
    start[place.row] = shiftLetter(start[place.row], steps);
    void turnScrambler(place.chain, place.scrambler, start.join(''));
  };

  const rackPitch = 64;
  const rackLeft = width / 2 - ((rotors.length - 1) * rackPitch) / 2;
  const rackY = rackTop + rackHeight / 2 - 4;
  const held = drag?.point && (rotorOf(drag.from) ?? (placeOf(drag.from) && rotorAt(placeOf(drag.from)!)));

  return (
    <svg ref={svg} className={spinning ? 'bombe-front spinning' : 'bombe-front'} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Front of the Bombe">
      <g className="drum-rack" role="group" aria-label="Drum rack">
        <rect className="wood" x={rackLeft - 44} y={rackTop} width={(rotors.length - 1) * rackPitch + 88} height={rackHeight - 8} rx={4} />
        <rect className="rack-lip" x={rackLeft - 44} y={rackTop + rackHeight - 14} width={(rotors.length - 1) * rackPitch + 88} height={6} />
        {rotors.map((rotor, index) => (
          <g
            key={rotor}
            className={['rack-drum', lightDrums.has(rotor) ? 'light' : '', picked === rotor ? 'selected' : ''].filter(Boolean).join(' ')}
            role="button"
            tabIndex={active ? undefined : 0}
            aria-label={`Drums ${rotor}`}
            aria-pressed={picked === rotor}
            data-socket={rackId(rotor)}
            onPointerDown={active ? undefined : (event) => grab(rackId(rotor), event)}
            onKeyDown={(event) => {
              if (!active && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                activate(rackId(rotor));
              } else if (event.key === 'Escape') {
                setPicked(null);
              }
            }}
          >
            <circle cx={rackLeft + index * rackPitch} cy={rackY} r={20} style={{ fill: drumColours[rotor] }} />
            <text x={rackLeft + index * rackPitch} y={rackY}>
              {rotor}
            </text>
          </g>
        ))}
      </g>
      <rect className="cabinet" x={margin} y={cabinetTop} width={cabinetRight - margin} height={height - margin - cabinetTop} rx={6} />
      {Array.from({ length: banks }, (_, chain) => (
        <g key={chain} aria-hidden="true">
          <rect className="bank" x={banksLeft - 8} y={bankTop(chain) - 8} width={chainLength * pitch + 16} height={bankHeight - 4} rx={4} />
          <rect className="label-plate" x={banksLeft} y={bankTop(chain) - 2} width={chainLength * pitch} height={18} rx={2} />
        </g>
      ))}
      {Array.from({ length: banks }, (_, chain) => (
        <text key={chain} className="chain-label" x={banksLeft + 8} y={bankTop(chain) + 7}>
          {chainLabel(machine, chain)}
        </text>
      ))}
      {machine.chains.flatMap((chain, chainIndex) =>
        chain.scramblers.map((scrambler, index) => {
          const x = slotX(index);
          const tested = scrambler.drums.every(Boolean);
          const letters = active ? advanceBy(position, scrambler.start) : scrambler.start;
          const jacks = scrambler.jacks.map((jack) => jack ?? '·').join('');
          return (
            <g key={`${chainIndex}-${index}`} className="scrambler" role="group" aria-label={`Chain ${chainIndex + 1} scrambler ${index + 1}: ${jacks}`}>
              {drumNames.map((name, row) => {
                const place = { chain: chainIndex, scrambler: index, row };
                const rotor = scrambler.drums[row];
                return (
                  <Drum
                    key={row}
                    x={x}
                    y={drumY(chainIndex, row)}
                    letter={letters[row]}
                    rotor={rotor}
                    empty={!rotor}
                    idle={!tested}
                    selected={drag?.from === placeId(place)}
                    socket={placeId(place)}
                    label={`${name} drum ${rotor ?? 'empty'}${rotor ? ` at ${letters[row]}` : ''}`}
                    onTurn={active || !rotor ? undefined : (steps) => turn(place, steps)}
                    onActivate={active ? undefined : () => activate(placeId(place))}
                    onGrab={active ? undefined : (event) => grab(placeId(place), event)}
                  />
                );
              })}
              <text className="scrambler-label" x={x} y={drumY(chainIndex, 2) + drumPitch / 2 + 6}>
                {scrambler.jacks.some(Boolean) ? jacks : ''}
              </text>
            </g>
          );
        }),
      )}
      <g className="indicator" role="group" aria-label={`Indicator ${indicator}`}>
        <rect className="bank" x={indicatorLeft} y={bankTop(1) - 8} width={indicatorWidth} height={bankHeight - 4} rx={4} />
        <text className="engraving plate-text" x={indicatorX} y={bankTop(1) + 7}>
          INDICATOR
        </text>
        {drumNames.map((name, drum) => (
          <Drum key={drum} x={indicatorX} y={drumY(1, drum)} letter={indicator[drum]} rotor={null} label={`${name} indicator ${indicator[drum]}`} />
        ))}
      </g>
      {held && drag?.point && (
        <circle className="held-drum" cx={drag.point.x} cy={drag.point.y} r={drumRadius} style={{ fill: drumColours[held] }} aria-hidden="true" />
      )}
    </svg>
  );
}

/** Why the Bombe cannot start yet, or null when it can. */
export function notReady(bombe: BombeState): string | null {
  const { machine } = bombe;
  const tested = groupsOf(machine).filter((chains) => machine.chains[chains[0]].testRegister);
  if (tested.length === 0) {
    return 'Plug a test register onto a common on the Back tab.';
  }
  const working = (chains: number[]) =>
    chains.some((chain) => machine.chains[chain].scramblers.some((scrambler) => scrambler.jacks.every(Boolean) && scrambler.drums.every(Boolean)));
  return tested.some(working) ? null : 'Fit all three drums on a cabled scrambler of a chain with a test register.';
}

/** The groups of chains a run tests, with their wheel orders: "Chains 1–2 II V III, Chain 3 no drums". */
export function groupsLine(run: BombeRun): string {
  return run.groups.map((group) => `${chainNames(group.chains)} ${group.wheelOrder ?? 'drums missing'}`).join(', ');
}

/** The paper the Bombe prints its stops on, a hundred at a time, kept until cleared. */
function Printout({ bombe }: { bombe: BombeState }) {
  const printout = useMachine((store) => store.printout);
  const loadPrintout = useMachine((store) => store.loadPrintout);
  const clearPrintout = useMachine((store) => store.clearPrintout);
  const total = bombe.printed;
  const shown = printout.length;

  // Stops printed while the first page is not full yet reload the first page.
  useEffect(() => {
    if (shown < Math.min(total, stopPage)) {
      void loadPrintout();
    }
  }, [total, shown, loadPrintout]);

  return (
    <section className="printout" aria-label="Printout">
      <h3>Printout</h3>
      {total === 0 ? (
        <p className="summary">No stops printed.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Chains</th>
              <th scope="col">Wheel order</th>
              <th scope="col">Indicator</th>
              <th scope="col">Test register</th>
              <th scope="col">Live wires</th>
              <th scope="col">Stecker</th>
            </tr>
          </thead>
          <tbody>
            {printout.map((stop) => (
              <tr key={stop.index}>
                <td>{stop.index + 1}</td>
                <td>{stop.chains.map((chain) => chain + 1).join('–')}</td>
                <td>{stop.wheelOrder ?? '—'}</td>
                <td className="letters">{stop.indicator}</td>
                <td className="letters">{stop.testRegister}</td>
                <td className="letters wires">{wiresOf(stop.liveWires)}</td>
                <td className="letters">{stop.stecker ? `${stop.testRegister}/${stop.stecker}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="crib-controls">
        {shown < total && shown > 0 && (
          <button type="button" onClick={() => void loadPrintout(true)}>
            Load more
          </button>
        )}
        <button type="button" disabled={total === 0 || isActive(bombe.run)} onClick={() => void clearPrintout()}>
          Clear printout
        </button>
      </p>
    </section>
  );
}

/** The front of the Bombe: the drums, the indicator and the printout. The run is worked from the side. */
export function FrontView() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe) {
    return null;
  }
  const active = isActive(bombe.run);

  return (
    <div className="bombe-view front-view">
      {!active && (
        <p className="summary">
          Drag drums from the rack onto a drum, or pick them in the rack and click a drum: the row fills up to that drum. Click a drum to take it out;
          scroll or use Arrow Up/Down to turn it. The run is started and watched on the Side tab.
        </p>
      )}
      <div className="bombe-front-frame">
        <Front bombe={bombe} />
      </div>
      <Printout bombe={bombe} />
    </div>
  );
}
