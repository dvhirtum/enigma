import { useState } from 'react';
import type { BombeRun, BombeState, PrintedStop } from '../api';
import { alphabet } from '../machine';
import { useMachine } from '../store';
import { Knob, Selector, ToggleSwitch } from './controls';
import { chainNames, formatSpeed, fullSpeedStep, speedAt, stepOf, wiresOf } from './drums';
import { groupsLine, isActive, notReady, RunButtons } from './FrontView';

const width = 460;
const height = 500;
const centre = width / 2;
const lampPitch = 26;
const lampsTop = 150;
const switchesY = 330;
const buttonsY = 430;

/** The test register: a stop lamp, the register letter, its 26 wire lamps (the live ones lit) and the stop reading. */
function TestRegister({ stop }: { stop: PrintedStop | null }) {
  const wires = stop ? wiresOf(stop.liveWires) : '';
  return (
    <g className="test-register">
      <text className="engraving plate-text" x={centre} y={40}>
        TEST REGISTER
      </text>
      <g className={stop ? 'stop-lamp lit' : 'stop-lamp'} role="img" aria-label={stop ? 'Stop lamp, lit' : 'Stop lamp'}>
        <circle className="lamp-rim" cx={70} cy={88} r={16} />
        <circle className="lamp-glass" cx={70} cy={88} r={12} />
        <text className="engraving" x={70} y={118}>
          STOP
        </text>
      </g>
      <rect className="letter-window" x={372} y={72} width={32} height={32} rx={3} />
      <text className="window-letter" x={388} y={88}>
        {stop?.testRegister ?? ''}
      </text>
      <text className="engraving" x={388} y={118}>
        LETTER
      </text>
      <g role={stop ? 'img' : undefined} aria-label={stop ? `Live wires ${stop.liveWires}` : undefined} aria-hidden={stop ? undefined : true}>
        {[...alphabet].map((letter, index) => {
          const x = centre + ((index % 13) - 6) * lampPitch;
          const y = lampsTop + Math.floor(index / 13) * 30;
          return (
            <g key={letter} className={wires[index] === letter ? 'wire-lamp lit' : 'wire-lamp'}>
              <circle cx={x} cy={y} r={11} />
              <text x={x} y={y}>
                {letter}
              </text>
            </g>
          );
        })}
      </g>
      {stop && (
        <g role="status">
          <text className="stop-reading" x={centre} y={lampsTop + 66}>
            {chainNames(stop.chains)}
            {stop.wheelOrder ? ` · ${stop.wheelOrder}` : ''}
          </text>
          <text className="stop-reading" x={centre} y={lampsTop + 86}>
            {stop.stecker ? `Stecker ${stop.testRegister}/${stop.stecker}` : 'No stecker'}
          </text>
        </g>
      )}
    </g>
  );
}

/** The speed knob. The speed is chosen when the drag or key press ends, not at every step on the way. */
function SpeedKnob({ x, y }: { x: number; y: number }) {
  const chosen = useMachine((store) => store.speed);
  const chooseSpeed = useMachine((store) => store.chooseSpeed);
  const [draft, setDraft] = useState<number | null>(null);
  const step = draft ?? stepOf(chosen);

  const commit = () => {
    if (draft !== null) {
      setDraft(null);
      void chooseSpeed(speedAt(draft));
    }
  };

  return (
    <Knob label="Speed" x={x} y={y} max={fullSpeedStep} value={step} valueText={(value) => formatSpeed(speedAt(value))} onDraft={setDraft} onCommit={commit}>
      <text className="speed-reading" x={x} y={y + 48}>
        {formatSpeed(speedAt(step))}
      </text>
    </Knob>
  );
}

/**
 * The right-hand side of the Bombe: the test register, then the diagonal board switch, the reflector switch and the
 * speed knob, and Start, Stop and Continue.
 */
function Side({ bombe }: { bombe: BombeState }) {
  const configureBombe = useMachine((store) => store.configureBombe);
  const [busy, setBusy] = useState(false);
  const { run } = bombe;
  const active = isActive(run);
  const stop = run?.pause ?? null;

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  return (
    <svg className="bombe-side" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Side of the Bombe">
      <rect className="cabinet" x={4} y={4} width={width - 8} height={height - 8} rx={6} />
      <rect className="end-plate" x={20} y={16} width={width - 40} height={250} rx={4} />
      <TestRegister stop={stop} />
      <rect className="end-plate" x={20} y={278} width={width - 40} height={height - 298} rx={4} />
      <g className="controls" role="group" aria-label="Controls">
        <ToggleSwitch
          label="Diagonal board"
          x={80}
          y={switchesY}
          on={bombe.settings.diagonalBoard}
          disabled={active || busy}
          onToggle={(on) => send(configureBombe({ diagonalBoard: on }))}
        />
        <Selector
          label="Reflector"
          x={centre}
          y={switchesY + 8}
          options={['B', 'C']}
          value={bombe.settings.reflector}
          disabled={active || busy}
          onSelect={(reflector) => send(configureBombe({ reflector }))}
        />
        <SpeedKnob x={370} y={switchesY} />
        <RunButtons
          bombe={bombe}
          places={[
            { x: 110, y: buttonsY },
            { x: centre, y: buttonsY },
            { x: 350, y: buttonsY },
          ]}
        />
      </g>
    </svg>
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
    </div>
  );
}

/** The side of the Bombe with the run: why it cannot start, the warnings, the progress, and the machine's controls. */
export function SideView() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe) {
    return null;
  }
  const active = isActive(bombe.run);
  const waiting = notReady(bombe);

  return (
    <div className="bombe-view side-view">
      {!active && waiting && <p className="summary">{waiting}</p>}
      {!active && bombe.machine.warnings.length > 0 && (
        <ul className="bombe-warnings" aria-label="Warnings">
          {bombe.machine.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      {bombe.run && <RunProgress run={bombe.run} />}
      <Side bombe={bombe} />
    </div>
  );
}
