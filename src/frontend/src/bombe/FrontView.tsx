import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { BombeMachine, BombeRun, BombeState, PrintedStop } from '../api';
import { usePlugDrag } from '../components/usePlugDrag';
import { useWheelTurn } from '../components/useWheelTurn';
import { shiftLetter } from '../machine';
import { stopPage, useMachine } from '../store';
import { advanceBy, chainLength, chainNames, drumColours, formatSpeed, fullSpeedStep, groupsOf, indicatorOf, rotors, rowsOf, speedAt, stepOf, wiresOf } from './drums';

const banks = 3;
const pitch = 50;
const drumRadius = 18;
const drumPitch = 44;
const labelHeight = 18;
const bankHeight = labelHeight + 3 * drumPitch + 30;
const margin = 24;
const rackHeight = 64;
const rackPitch = 56;
const banksTop = margin + rackHeight;
const indicatorX = margin + chainLength * pitch + 40;
const width = indicatorX + 90;
const height = banksTop + banks * bankHeight + margin;

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

interface DrumProps {
  x: number;
  y: number;
  letter: string;
  rotor: string | null;
  label: string;
  /** No drum fitted here: dashed, without a letter. */
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
 * A drum: its rotor colour (dashed when none is fitted) and letter. The mouse wheel or Arrow Up/Down turn it; Enter or
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

  return (
    <g
      ref={wheel}
      className={['drum', empty ? 'empty' : '', idle ? 'idle' : '', interactive ? 'settable' : '', selected ? 'selected' : ''].filter(Boolean).join(' ')}
      aria-label={label}
      role={interactive ? 'spinbutton' : 'img'}
      aria-valuetext={interactive ? letter : undefined}
      tabIndex={interactive ? 0 : undefined}
      data-socket={socket}
      onKeyDown={interactive ? onKeyDown : undefined}
      onPointerDown={onGrab}
    >
      <circle className="rim" cx={x} cy={y} r={drumRadius} style={rotor ? { stroke: drumColours[rotor] } : undefined} />
      {!empty && <line className="marker" x1={x} y1={y - drumRadius + 2} x2={x} y2={y - drumRadius + 8} transform={`rotate(${angle} ${x} ${y})`} />}
      {!empty && (
        <text x={x} y={y}>
          {letter}
        </text>
      )}
    </g>
  );
}

const slotX = (scrambler: number) => margin + scrambler * pitch + pitch / 2;
const chainTop = (chain: number) => banksTop + chain * bankHeight + labelHeight;

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
 * The front of the Bombe: the drum rack, three banks (chains) of twelve scramblers with three drums each (upper, middle,
 * lower), and the indicator drums. Before a run, drag a drum from the rack onto a drum place, or pick it in the rack
 * and then click the place: it fills that row of the chain from the first scrambler up to the place. A click on a
 * fitted drum, or dragging it off, takes it out; the mouse wheel or Arrow Up/Down turn its letter.
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

  const rackLeft = width / 2 - ((rotors.length - 1) * rackPitch) / 2;
  const held = drag?.point && (rotorOf(drag.from) ?? (placeOf(drag.from) && rotorAt(placeOf(drag.from)!)));

  return (
    <svg ref={svg} className={spinning ? 'bombe-front spinning' : 'bombe-front'} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Front of the Bombe">
      <g className="drum-rack" role="group" aria-label="Drum rack">
        <rect x={rackLeft - 36} y={margin - 4} width={(rotors.length - 1) * rackPitch + 72} height={rackHeight - 16} rx={6} />
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
            <circle cx={rackLeft + index * rackPitch} cy={margin + rackHeight / 2 - 12} r={18} style={{ fill: drumColours[rotor] }} />
            <text x={rackLeft + index * rackPitch} y={margin + rackHeight / 2 - 12}>
              {rotor}
            </text>
          </g>
        ))}
      </g>
      {Array.from({ length: banks }, (_, chain) => (
        <text key={chain} className="chain-label" x={margin} y={banksTop + chain * bankHeight + labelHeight / 2 - 4}>
          {chainLabel(machine, chain)}
        </text>
      ))}
      {machine.chains.flatMap((chain, chainIndex) =>
        chain.scramblers.map((scrambler, index) => {
          const x = slotX(index);
          const top = chainTop(chainIndex);
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
                    y={top + drumRadius + row * drumPitch}
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
              <text className="scrambler-label" x={x} y={top + 3 * drumPitch + 6}>
                {scrambler.jacks.some(Boolean) ? jacks : ''}
              </text>
            </g>
          );
        }),
      )}
      <g className="indicator" role="group" aria-label={`Indicator ${indicator}`}>
        <text className="indicator-label" x={indicatorX} y={banksTop + labelHeight / 2 - 4}>
          Indicator
        </text>
        {drumNames.map((name, drum) => (
          <Drum key={drum} x={indicatorX} y={banksTop + labelHeight + drumRadius + drum * drumPitch} letter={indicator[drum]} rotor={null} label={`${name} indicator ${indicator[drum]}`} />
        ))}
      </g>
      {held && drag?.point && (
        <circle className="held-drum" cx={drag.point.x} cy={drag.point.y} r={drumRadius} style={{ fill: drumColours[held] }} aria-hidden="true" />
      )}
    </svg>
  );
}

function RunSettings({ bombe, locked }: { bombe: BombeState; locked: boolean }) {
  const configureBombe = useMachine((store) => store.configureBombe);
  const [busy, setBusy] = useState(false);
  const disabled = locked || busy;

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  return (
    <div className="run-settings">
      <fieldset>
        <legend>Reflector</legend>
        {['B', 'C'].map((reflector) => (
          <label key={reflector}>
            <input
              type="radio"
              name="reflector"
              checked={bombe.settings.reflector === reflector}
              disabled={disabled}
              onChange={() => send(configureBombe({ reflector }))}
            />
            {reflector}
          </label>
        ))}
      </fieldset>
    </div>
  );
}

/** Why the Bombe cannot start yet, or null when it can. */
export function notReady(bombe: BombeState): string | null {
  const { machine } = bombe;
  return groupsOf(machine).some((chains) => machine.chains[chains[0]].testRegister) ? null : 'Plug a test register onto a common on the Back tab.';
}

/** The speed slider. The speed is chosen when the drag or key press ends, not at every step on the way. */
function SpeedControl() {
  const chosen = useMachine((store) => store.speed);
  const chooseSpeed = useMachine((store) => store.chooseSpeed);
  const [draft, setDraft] = useState<number | null>(null);
  const step = draft ?? stepOf(chosen);
  const speed = speedAt(step);

  const commit = () => {
    if (draft !== null) {
      setDraft(null);
      void chooseSpeed(speedAt(draft));
    }
  };

  return (
    <label className="speed">
      Speed
      <input
        type="range"
        min={0}
        max={fullSpeedStep}
        value={step}
        aria-valuetext={formatSpeed(speed)}
        onChange={(event) => setDraft(Number(event.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
      />
      <span className="summary">{formatSpeed(speed)}</span>
    </label>
  );
}

function elapsed(seconds: number): string {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}

function plural(count: number, one: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : `${one}s`}`;
}

/** The groups of chains a run tests, with their wheel orders: "Chains 1–2 II V III, Chain 3 no drums". */
export function groupsLine(run: BombeRun): string {
  return run.groups.map((group) => `${chainNames(group.chains)} ${group.wheelOrder ?? 'drums missing'}`).join(', ');
}

/** The test register's 26 lamps, the live ones lit. */
function TestRegisterLamps({ stop }: { stop: PrintedStop }) {
  return (
    <span className="register-lamps" role="img" aria-label={`Live wires ${stop.liveWires}`}>
      {[...wiresOf(stop.liveWires)].map((letter, index) => (
        <span key={index} className={letter === '·' ? 'dark' : 'lit'}>
          {letter === '·' ? String.fromCharCode(65 + index) : letter}
        </span>
      ))}
    </span>
  );
}

function RunProgress({ run }: { run: BombeRun }) {
  const continueRun = useMachine((store) => store.continueRun);
  const stop = run.pause;
  const state = { Running: 'Running', Paused: 'Stopped', Finished: 'Finished', Cancelled: 'Cancelled', Failed: 'Failed' }[run.status];
  return (
    <div className="run-progress">
      <progress max={run.positions} value={run.positionsTested} aria-label="Positions tested" />
      <p className="summary" aria-label="Run progress">
        {state} · {groupsLine(run)} · {run.positionsTested.toLocaleString('en-US')} of {plural(run.positions, 'position')} · {plural(run.stops, 'stop')} ·{' '}
        {elapsed(run.elapsedSeconds)}
        {run.logged ? ' · stops go to the Hut 8 notebook' : ''}
      </p>
      {run.error && (
        <p className="menu-warning" role="alert">
          {run.error}
        </p>
      )}
      {stop && (
        <div className="bombe-stop" role="status">
          <p>
            {chainNames(stop.chains)} stopped{stop.wheelOrder ? ` on ${stop.wheelOrder}` : ''}: indicator <strong>{stop.indicator}</strong>. Test register{' '}
            {stop.testRegister}: <TestRegisterLamps stop={stop} />
            {stop.stecker ? (
              <>
                {' '}
                stecker{' '}
                <strong>
                  {stop.testRegister}/{stop.stecker}
                </strong>
              </>
            ) : (
              ', no stecker'
            )}
            .
          </p>
          <button type="button" onClick={() => void continueRun()}>
            Continue
          </button>
        </div>
      )}
    </div>
  );
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

/** The front of the Bombe with the run: reflector, speed, start and stop, the progress, the drums and the printout. */
export function FrontView() {
  const bombe = useMachine((store) => store.bombe);
  const speed = useMachine((store) => store.speed);
  const startRun = useMachine((store) => store.startRun);
  const cancelRun = useMachine((store) => store.cancelRun);
  if (!bombe) {
    return null;
  }
  const active = isActive(bombe.run);
  const waiting = notReady(bombe);

  return (
    <div className="bombe-view front-view">
      <RunSettings bombe={bombe} locked={active} />
      <div className="crib-controls">
        <SpeedControl />
        {active ? (
          <button type="button" onClick={() => void cancelRun()}>
            Stop
          </button>
        ) : (
          <button type="button" disabled={waiting !== null} onClick={() => void startRun(speed)}>
            Start
          </button>
        )}
        {!active && waiting && <p className="summary">{waiting}</p>}
      </div>
      {!active && bombe.machine.warnings.length > 0 && (
        <ul className="bombe-warnings" aria-label="Warnings">
          {bombe.machine.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {bombe.run && <RunProgress run={bombe.run} />}
      {!active && (
        <p className="summary">
          Drag drums from the rack onto a drum, or pick them in the rack and click a drum: the row fills up to that drum. Click a drum to take it out;
          scroll or use Arrow Up/Down to turn it.
        </p>
      )}
      <div className="bombe-front-frame">
        <Front bombe={bombe} />
      </div>
      <Printout bombe={bombe} />
    </div>
  );
}
