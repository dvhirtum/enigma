import { useEffect } from 'react';
import type { BombeRun, BombeStop } from '../api';
import { groupsLine, isActive, notReady } from '../bombe/FrontView';
import { Hand } from '../notebook/paper';
import { stopPage, useMachine } from '../store';
import { plural } from './letters';

const states: Record<BombeRun['status'], string> = { Running: 'Running', Paused: 'Stopped', Finished: 'Finished', Cancelled: 'Cancelled', Failed: 'Failed' };

/** The run as the Bombe room reports it: state, wheel orders, positions and stops. */
export function RunReport({ run }: { run: BombeRun }) {
  return (
    <p aria-label="Run progress">
      {states[run.status]} · {groupsLine(run)} · {run.positionsTested.toLocaleString('en-US')} of {plural(run.positions, 'position')} ·{' '}
      {plural(run.allStops, 'stop')}
    </p>
  );
}

/** Follows the run of the Bombe plugged up with the menu, and plugs it up again when it was changed by hand. */
export function RunStep({ onDone }: { onDone: () => void }) {
  const bombe = useMachine((store) => store.bombe);
  const plugUpMenu = useMachine((store) => store.plugUpMenu);
  if (!bombe) {
    return null;
  }

  const { run } = bombe;
  const waiting = notReady(bombe);
  return (
    <>
      <p>
        The Bombe in the machine window is plugged up with the menu. Fit the drums on the <strong>Front</strong> tab, check the cables and the diagonal
        board on the <strong>Back</strong> tab, then Start. While this notebook is open, each stop is written down here.
      </p>
      {!bombe.machine.pluggedForMenu && !isActive(run) && (
        <p className="notebook-warning">
          The Bombe is no longer plugged up for this menu.{' '}
          <button type="button" onClick={() => void plugUpMenu()}>
            Plug it up again
          </button>
        </p>
      )}
      {!isActive(run) && waiting && <p className="hut8-note">{waiting}</p>}
      {run && <RunReport run={run} />}
      {run?.error && <p className="notebook-warning">{run.error}</p>}
      {isActive(run) && bombe.stops > 0 && (
        <p className="notebook-actions">
          <button type="button" onClick={onDone}>
            Check the stops found so far
          </button>
        </p>
      )}
      {run && !isActive(run) && bombe.stops === 0 && (
        <p className="notebook-warning">No stops. Try more wheel orders, the other reflector, or a different crib or menu.</p>
      )}
    </>
  );
}

const verdicts: Record<BombeStop['verdict'], string> = { Unchecked: '', True: '✓', False: '✗' };

/** The stops of the runs on the menu, a hundred at a time. A row opens its check. */
export function StopsStep() {
  const run = useMachine((store) => store.bombe?.run ?? null);
  const total = useMachine((store) => store.bombe?.stops ?? 0);
  const stops = useMachine((store) => store.stops);
  const loadStops = useMachine((store) => store.loadStops);
  const openCheck = useMachine((store) => store.openCheck);
  const clearStops = useMachine((store) => store.clearStops);
  const shown = stops.length;
  const active = isActive(run);

  // Stops found while the first page is not full yet reload the first page.
  useEffect(() => {
    if (shown < Math.min(total, stopPage)) {
      void loadStops();
    }
  }, [total, shown, loadStops]);

  return (
    <>
      <p>
        Pick a stop to test on the checking machine. {plural(total, 'stop')}
        {active ? ' so far' : ''}
        {shown < total && `, ${shown.toLocaleString('en-US')} written down`}.
      </p>
      {shown > 0 && (
        <table className="hut8-stops">
          <thead>
            <tr>
              <th scope="col">#</th>
              <th scope="col">Wheel order</th>
              <th scope="col">Indicator</th>
              <th scope="col">Stecker</th>
              <th scope="col">Verdict</th>
              <th scope="col">
                <span className="visually-hidden">Check</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {stops.map((stop) => (
              <tr key={stop.index} className={stop.verdict.toLowerCase()} onClick={() => void openCheck(stop.index)}>
                <td>{stop.index + 1}</td>
                <td className="hand">{stop.wheelOrder}</td>
                <td className="hand">{stop.indicator}</td>
                <td className="hand">{stop.stecker ? `${stop.testRegister}/${stop.stecker}` : '—'}</td>
                <td className="hand verdict">{verdicts[stop.verdict]}</td>
                <td>
                  <button
                    type="button"
                    aria-label={`Check stop ${stop.index + 1}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      void openCheck(stop.index);
                    }}
                  >
                    Check
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="notebook-actions">
        {shown < total && shown > 0 && (
          <button type="button" onClick={() => void loadStops(true)}>
            Load more
          </button>
        )}
        <button type="button" disabled={active} onClick={() => void clearStops()}>
          Clear stops
        </button>
      </p>
    </>
  );
}

/** The stop being checked, in one line. */
export function StopLine({ stop }: { stop: BombeStop }) {
  return (
    <p>
      Stop {stop.index + 1}: <Hand>{stop.wheelOrder}</Hand> at <Hand>{stop.indicator}</Hand>, {stop.stecker ? <Hand>{`${stop.testRegister}/${stop.stecker}`}</Hand> : 'no stecker'}
    </p>
  );
}
