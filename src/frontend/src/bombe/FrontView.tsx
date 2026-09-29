import { useState } from 'react';
import type { BombeRun, BombeState } from '../api';
import { useMachine } from '../store';
import {
  advance,
  drumColours,
  formatSpeed,
  fullSpeedStep,
  indicatorOf,
  rotors,
  rotorsOf,
  scramblersOf,
  speedAt,
  stepOf,
  wheelOrdersOf,
} from './drums';
import { drumLetters } from './MenuView';

const columns = 12;
const banks = 3;
const pitch = 50;
const drumRadius = 18;
const drumPitch = 44;
const bankHeight = 3 * drumPitch + 30;
const margin = 24;
const indicatorX = margin + columns * pitch + 40;
const width = indicatorX + 90;
const height = banks * bankHeight + margin;

export function isActive(run: BombeRun | null | undefined): boolean {
  return run?.status === 'Running' || run?.status === 'Paused';
}

function Drum({ x, y, letter, rotor, label }: { x: number; y: number; letter: string; rotor: string | null; label: string }) {
  const angle = ((letter.charCodeAt(0) - 65) * 360) / 26;
  return (
    <g className="drum" aria-label={label} role="img">
      <circle className="rim" cx={x} cy={y} r={drumRadius} style={rotor ? { stroke: drumColours[rotor] } : undefined} />
      <line className="marker" x1={x} y1={y - drumRadius + 2} x2={x} y2={y - drumRadius + 8} transform={`rotate(${angle} ${x} ${y})`} />
      <text x={x} y={y}>
        {letter}
      </text>
    </g>
  );
}

const drumNames = ['upper', 'middle', 'lower'];

/**
 * The front of the Bombe: three banks of twelve scramblers, three drums each (upper, middle, lower), and the indicator
 * drums. The menu's scramblers show their drum letters; the others are empty.
 */
function Front({ bombe }: { bombe: BombeState }) {
  const run = bombe.run;
  const spinning = run?.status === 'Running' && run.speed === null;
  const position = (isActive(run) && run?.position) || 'ZZZ';
  const wheelOrder = run?.wheelOrder ?? (spinning ? null : (bombe.settings.wheelOrders[0] ?? null));
  const drumRotors = wheelOrder?.split(' ') ?? [null, null, null];
  const scramblers = scramblersOf(bombe.menu?.links ?? []);
  const indicator = indicatorOf(position);

  return (
    <svg className={spinning ? 'bombe-front spinning' : 'bombe-front'} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Front of the Bombe">
      {Array.from({ length: banks * columns }, (_, index) => {
        const x = margin + (index % columns) * pitch + pitch / 2;
        const top = margin + Math.floor(index / columns) * bankHeight;
        const link = scramblers[index];
        if (!link) {
          return (
            <g key={index} className="scrambler empty" aria-hidden="true">
              {drumNames.map((_, drum) => (
                <circle key={drum} cx={x} cy={top + drumRadius + drum * drumPitch} r={4} />
              ))}
            </g>
          );
        }
        const letters = advance(position, link.offset);
        return (
          <g key={index} className="scrambler" role="group" aria-label={`Scrambler ${index + 1}: ${link.first}–${link.second} at ${drumLetters(link.offset)}`}>
            {drumNames.map((name, drum) => (
              <Drum key={drum} x={x} y={top + drumRadius + drum * drumPitch} letter={letters[drum]} rotor={drumRotors[drum]} label={`${name} drum ${letters[drum]}`} />
            ))}
            <text className="scrambler-label" x={x} y={top + 3 * drumPitch + 6}>
              {link.first}
              {link.second} {link.offset}
            </text>
          </g>
        );
      })}
      <g className="indicator" role="group" aria-label={`Indicator ${indicator}`}>
        <text className="indicator-label" x={indicatorX} y={margin - 8}>
          Indicator
        </text>
        {drumNames.map((name, drum) => (
          <Drum key={drum} x={indicatorX} y={margin + drumRadius + drum * drumPitch} letter={indicator[drum]} rotor={null} label={`${name} indicator ${indicator[drum]}`} />
        ))}
      </g>
    </svg>
  );
}

function RunSettings({ bombe, locked }: { bombe: BombeState; locked: boolean }) {
  const configureBombe = useMachine((store) => store.configureBombe);
  const [busy, setBusy] = useState(false);
  const chosen = rotorsOf(bombe.settings.wheelOrders);
  const disabled = locked || busy;

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  const toggle = (rotor: string) => {
    const next = chosen.includes(rotor) ? chosen.filter((own) => own !== rotor) : [...chosen, rotor];
    send(configureBombe({ wheelOrders: wheelOrdersOf(next) }));
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
      <fieldset>
        <legend>Rotors</legend>
        {rotors.map((rotor) => (
          <label key={rotor}>
            <input
              type="checkbox"
              aria-label={`Rotor ${rotor}`}
              checked={chosen.includes(rotor)}
              disabled={disabled || (chosen.includes(rotor) && chosen.length === 3)}
              onChange={() => toggle(rotor)}
            />
            <span className="swatch" style={{ background: drumColours[rotor] }} />
            {rotor}
          </label>
        ))}
        <span className="summary" aria-label="Wheel orders">
          {bombe.settings.wheelOrders.length === 1 ? `Wheel order ${bombe.settings.wheelOrders[0]}` : `${bombe.settings.wheelOrders.length} wheel orders`}
        </span>
      </fieldset>
    </div>
  );
}

function SpeedControl() {
  const speed = useMachine((store) => store.speed);
  const chooseSpeed = useMachine((store) => store.chooseSpeed);
  return (
    <label className="speed">
      Speed
      <input
        type="range"
        min={0}
        max={fullSpeedStep}
        value={stepOf(speed)}
        aria-valuetext={formatSpeed(speed)}
        onChange={(event) => void chooseSpeed(speedAt(Number(event.target.value)))}
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
        {state}
        {run.wheelOrder && ` · wheel order ${run.wheelOrder}`} · {run.wheelOrdersDone} of {plural(run.wheelOrders, 'wheel order')} done · {plural(run.stops, 'stop')} ·{' '}
        {elapsed(run.elapsedSeconds)}
      </p>
      {run.error && (
        <p className="menu-warning" role="alert">
          {run.error}
        </p>
      )}
      {stop && (
        <div className="bombe-stop" role="status">
          <p>
            Stop on wheel order {stop.wheelOrder}: indicator <strong>{stop.indicator}</strong> (core {stop.position}). Test register {stop.testRegister}:{' '}
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

/** The front of the Bombe with the run: reflector, rotors, speed, start and stop, and the progress. */
export function FrontView() {
  const bombe = useMachine((store) => store.bombe);
  const speed = useMachine((store) => store.speed);
  const startRun = useMachine((store) => store.startRun);
  const cancelRun = useMachine((store) => store.cancelRun);
  if (!bombe) {
    return null;
  }
  const active = isActive(bombe.run);

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
          <button type="button" disabled={!bombe.menu} onClick={() => void startRun(speed)}>
            Start
          </button>
        )}
        {!bombe.menu && <p className="summary">Build a menu first.</p>}
      </div>
      {bombe.run && <RunProgress run={bombe.run} />}
      <Front bombe={bombe} />
    </div>
  );
}
