import { useState, type KeyboardEvent } from 'react';
import type { BombeRun, BombeState } from '../api';
import { useWheelTurn } from '../components/useWheelTurn';
import { shiftLetter } from '../machine';
import { useMachine } from '../store';
import { advanceBy, chainLength, drumColours, formatSpeed, fullSpeedStep, indicatorOf, rotors, slotsOf, speedAt, stepOf, type ScramblerSlot } from './drums';
import { drumLetters } from './MenuView';

const banks = 3;
const pitch = 50;
const drumRadius = 18;
const drumPitch = 44;
const labelHeight = 18;
const bankHeight = labelHeight + 3 * drumPitch + 30;
const margin = 24;
const indicatorX = margin + chainLength * pitch + 40;
const width = indicatorX + 90;
const height = banks * bankHeight + margin;

export function isActive(run: BombeRun | null | undefined): boolean {
  return run?.status === 'Running' || run?.status === 'Paused';
}

const drumNames = ['upper', 'middle', 'lower'];

interface DrumProps {
  x: number;
  y: number;
  letter: string;
  rotor: string | null;
  label: string;
  /** A scrambler drum without a rotor fitted: dashed. */
  empty?: boolean;
  /** A drum that stands still while the Bombe runs: its copy is not tested. */
  idle?: boolean;
  /** Turns the drum's letter; left out for drums that cannot be turned by hand. */
  onTurn?: (steps: number) => void;
  /** Opens the rotor choice for the drum's row. */
  onPick?: () => void;
}

/** A drum: its rotor colour (empty when none is fitted) and letter. The mouse wheel or Arrow Up/Down turn it; a click picks the rotor. */
function Drum({ x, y, letter, rotor, label, empty = false, idle = false, onTurn, onPick }: DrumProps) {
  const wheel = useWheelTurn<SVGGElement>((steps) => onTurn?.(steps), !onTurn);
  const angle = ((letter.charCodeAt(0) - 65) * 360) / 26;
  const interactive = Boolean(onTurn ?? onPick);
  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined && onTurn) {
      event.preventDefault();
      onTurn(steps);
    } else if ((event.key === 'Enter' || event.key === ' ') && onPick) {
      event.preventDefault();
      onPick();
    }
  };

  return (
    <g
      ref={wheel}
      className={['drum', empty ? 'empty' : '', idle ? 'idle' : '', interactive ? 'settable' : ''].filter(Boolean).join(' ')}
      aria-label={label}
      role={interactive ? 'spinbutton' : 'img'}
      aria-valuetext={interactive ? letter : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? onKeyDown : undefined}
      onClick={onPick}
    >
      <circle className="rim" cx={x} cy={y} r={drumRadius} style={rotor ? { stroke: drumColours[rotor] } : undefined} />
      <line className="marker" x1={x} y1={y - drumRadius + 2} x2={x} y2={y - drumRadius + 8} transform={`rotate(${angle} ${x} ${y})`} />
      <text x={x} y={y}>
        {letter}
      </text>
    </g>
  );
}

/** The drum whose row is being fitted: its copy, row and scrambler slot. */
interface Picking {
  copy: number;
  row: number;
  slot: number;
}

const slotX = (slot: number) => margin + (slot % chainLength) * pitch + pitch / 2;
const slotTop = (slot: number) => margin + Math.floor(slot / chainLength) * bankHeight + labelHeight;

/** The chains a copy of the menu takes, such as "chain 2" or "chains 1–2". */
export function chainsOf(copy: number, chainsPerCopy: number): string {
  const first = copy * chainsPerCopy + 1;
  return chainsPerCopy === 1 ? `chain ${first}` : `chains ${first}–${first + chainsPerCopy - 1}`;
}

/** The rotors to fit in a row of a copy; a rotor in another row of the copy cannot be picked. */
function RotorPicker({ bombe, picking, onClose }: { bombe: BombeState; picking: Picking; onClose: () => void }) {
  const fitDrums = useMachine((store) => store.fitDrums);
  const drums = bombe.machine?.copies[picking.copy]?.drums ?? [];
  const row = drumNames[picking.row];
  const chains = chainsOf(picking.copy, bombe.machine?.chainsPerCopy ?? 1);
  const pick = (rotor: string | null) => {
    onClose();
    void fitDrums(picking.copy, picking.row, rotor);
  };

  return (
    <div
      className="rotor-picker"
      role="dialog"
      aria-label={`Drums for the ${row} row of ${chains}`}
      style={{
        left: `${(slotX(picking.slot) / width) * 100}%`,
        // Keeps the picker over the machine: to the right of drums on the left, to the left of drums on the right.
        transform: `translateX(${[0, -50, -100][Math.floor(((picking.slot % chainLength) * 3) / chainLength)]}%)`,
        top: `${((slotTop(picking.slot) + picking.row * drumPitch + 2 * drumRadius) / height) * 100}%`,
      }}
      onKeyDown={(event) => event.key === 'Escape' && onClose()}
    >
      <p className="summary">
        {row[0].toUpperCase() + row.slice(1)} row, {chains}
      </p>
      <div className="rotor-choices">
        {rotors.map((rotor) => (
          <button
            key={rotor}
            type="button"
            aria-pressed={drums[picking.row] === rotor}
            disabled={drums.some((own, other) => own === rotor && other !== picking.row)}
            onClick={() => pick(rotor)}
          >
            <span className="swatch" style={{ background: drumColours[rotor] }} />
            {rotor}
          </button>
        ))}
      </div>
      <div className="rotor-choices">
        <button type="button" disabled={drums[picking.row] === null} onClick={() => pick(null)}>
          Empty
        </button>
        <button type="button" autoFocus onClick={onClose}>
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * A chain's label: the chains the menu takes there and their wheel order, or not in use. A menu on more than one chain
 * is labelled on its first chain only.
 */
function chainLabel(bombe: BombeState, chain: number): string {
  const machine = bombe.machine;
  const copy = machine ? Math.floor(chain / machine.chainsPerCopy) : 0;
  if (!machine || copy >= machine.copies.length) {
    return `Chain ${chain + 1} · not in use`;
  }
  if (chain % machine.chainsPerCopy !== 0) {
    return '';
  }
  const drums = machine.copies[copy].drums;
  const order = drums.every((rotor) => rotor) ? drums.join(' ') : drums.some((rotor) => rotor) ? 'drums missing' : 'no drums';
  const chains = chainsOf(copy, machine.chainsPerCopy);
  return `${chains[0].toUpperCase()}${chains.slice(1)} · ${order}`;
}

/** How the menu sits on the chains. */
function layoutNote(bombe: BombeState): string | null {
  const machine = bombe.machine;
  if (!machine || !bombe.menu) {
    return null;
  }
  const links = bombe.menu.links.length;
  return machine.copies.length > 1
    ? `The menu's ${links} links fit on one chain, so each chain runs the menu with its own drums: ${machine.copies.length} wheel orders in one run.`
    : `The menu's ${links} links take ${machine.chainsPerCopy} chains, so one wheel order runs at a time.`;
}

/**
 * The front of the Bombe: three banks (chains) of twelve scramblers, three drums each (upper, middle, lower), and the
 * indicator drums. The menu is plugged up on each chain it fits (one copy per chain, or per two or three chains for a
 * longer menu); its scramblers show their drums and letters, and the scramblers not in use are empty. Before a run, a
 * click on a drum picks the rotor for its row of the copy, and the mouse wheel or Arrow Up/Down turn its letter.
 */
function Front({ bombe }: { bombe: BombeState }) {
  const turnScrambler = useMachine((store) => store.turnScrambler);
  const [picking, setPicking] = useState<Picking | null>(null);
  const run = bombe.run;
  const active = isActive(run);
  const spinning = run?.status === 'Running' && run.speed === null;
  const position = !active ? 'ZZZ' : run?.pause ? indicatorOf(run.pause.indicator) : (run?.position ?? 'ZZZ');
  const slots = new Map(slotsOf(bombe).map((slot) => [slot.slot, slot]));
  const perCopy = (bombe.machine?.chainsPerCopy ?? 1) * chainLength;
  const indicator = indicatorOf(position);

  const turn = (slot: ScramblerSlot, row: number, steps: number) => {
    const start = [...slot.start];
    start[row] = shiftLetter(start[row], steps);
    void turnScrambler(slot.copy, slot.scrambler, start.join(''));
  };

  return (
    <div className="bombe-front-frame">
      <svg className={spinning ? 'bombe-front spinning' : 'bombe-front'} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Front of the Bombe">
        {Array.from({ length: banks }, (_, chain) => (
          <text key={chain} className="chain-label" x={margin} y={margin + chain * bankHeight + labelHeight / 2 - 4}>
            {chainLabel(bombe, chain)}
          </text>
        ))}
        {Array.from({ length: banks * chainLength }, (_, index) => {
          const x = slotX(index);
          const top = slotTop(index);
          const slot = slots.get(index);
          if (!slot) {
            return (
              <g key={index} className="scrambler empty" aria-hidden="true">
                {drumNames.map((_, drum) => (
                  <circle key={drum} cx={x} cy={top + drumRadius + drum * drumPitch} r={4} />
                ))}
              </g>
            );
          }
          const drums = bombe.machine?.copies[slot.copy].drums ?? [];
          // Only copies with all drums fitted are tested; the others stand still.
          const tested = drums.length === 3 && drums.every(Boolean);
          const letters = tested ? advanceBy(position, slot.start) : slot.start;
          return (
            <g
              key={index}
              className="scrambler"
              role="group"
              aria-label={`Copy ${slot.copy + 1} scrambler ${(slot.slot % perCopy) + 1}: ${slot.first}–${slot.second} at ${drumLetters(slot.offset)}`}
            >
              {drumNames.map((name, row) => (
                <Drum
                  key={row}
                  x={x}
                  y={top + drumRadius + row * drumPitch}
                  letter={letters[row]}
                  rotor={drums[row] ?? null}
                  empty={!drums[row]}
                  idle={!tested}
                  label={`${name} drum ${drums[row] ?? 'empty'} at ${letters[row]}`}
                  onTurn={active ? undefined : (steps) => turn(slot, row, steps)}
                  onPick={active ? undefined : () => setPicking({ copy: slot.copy, row, slot: slot.slot })}
                />
              ))}
              <text className="scrambler-label" x={x} y={top + 3 * drumPitch + 6}>
                {slot.first}
                {slot.second} {slot.offset}
              </text>
            </g>
          );
        })}
        <g className="indicator" role="group" aria-label={`Indicator ${indicator}`}>
          <text className="indicator-label" x={indicatorX} y={margin + labelHeight / 2 - 4}>
            Indicator
          </text>
          {drumNames.map((name, drum) => (
            <Drum
              key={drum}
              x={indicatorX}
              y={margin + labelHeight + drumRadius + drum * drumPitch}
              letter={indicator[drum]}
              rotor={null}
              label={`${name} indicator ${indicator[drum]}`}
            />
          ))}
        </g>
      </svg>
      {picking && !active && <RotorPicker bombe={bombe} picking={picking} onClose={() => setPicking(null)} />}
    </div>
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
  if (!bombe.menu) {
    return 'Build a menu first.';
  }
  const copies = bombe.machine?.copies ?? [];
  const partial = copies.findIndex((copy) => copy.drums.some((rotor) => rotor) && !copy.drums.every((rotor) => rotor));
  if (partial >= 0) {
    return `Fit drums in all three rows of ${chainsOf(partial, bombe.machine!.chainsPerCopy)}, or take them all out.`;
  }
  return copies.some((copy) => copy.drums.every((rotor) => rotor)) ? null : 'Click a drum to fit drums in its row.';
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

function RunProgress({ run }: { run: BombeRun }) {
  const continueRun = useMachine((store) => store.continueRun);
  const stop = run.pause;
  const state = { Running: 'Running', Paused: 'Stopped', Finished: 'Finished', Cancelled: 'Cancelled', Failed: 'Failed' }[run.status];
  return (
    <div className="run-progress">
      <progress max={run.positions} value={run.positionsTested} aria-label="Positions tested" />
      <p className="summary" aria-label="Run progress">
        {state} · {run.wheelOrders.join(', ')} · {run.positionsTested.toLocaleString('en-US')} of {plural(run.positions, 'position')} ·{' '}
        {plural(run.stops, 'stop')} · {elapsed(run.elapsedSeconds)}
      </p>
      {run.error && (
        <p className="menu-warning" role="alert">
          {run.error}
        </p>
      )}
      {stop && (
        <div className="bombe-stop" role="status">
          <p>
            Stop on wheel order {stop.wheelOrder}: indicator <strong>{stop.indicator}</strong>. Test register {stop.testRegister}:{' '}
            {stop.stecker ? (
              <>
                stecker{' '}
                <strong>
                  {stop.testRegister}/{stop.stecker}
                </strong>
              </>
            ) : (
              `${stop.liveWires.length} live wires, no stecker`
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

/** The front of the Bombe with the run: reflector, speed, start and stop, the progress and the drums. */
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
      {bombe.run && <RunProgress run={bombe.run} />}
      {layoutNote(bombe) && <p className="summary">{layoutNote(bombe)} Click a drum to pick the rotor for its row; scroll or use Arrow Up/Down to turn it.</p>}
      <Front bombe={bombe} />
    </div>
  );
}
