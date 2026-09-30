import { useEffect } from 'react';
import type { BombeStop } from '../api';
import { stopPage, useMachine } from '../store';
import { isActive } from './FrontView';

const verdicts: Record<BombeStop['verdict'], string> = { Unchecked: '', True: 'True', False: 'False' };

/** The stops of the runs on the menu, a hundred at a time. A row opens its check on the Checking view. */
export function StopsView() {
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

  if (total === 0) {
    return (
      <div className="bombe-view">
        <p className="bombe-empty">No stops yet. Start the Bombe on the Front tab.</p>
      </div>
    );
  }

  return (
    <div className="bombe-view">
      <div className="check-actions">
        <p className="summary">
          {total === 1 ? '1 stop' : `${total.toLocaleString('en-US')} stops`}
          {active ? ' so far' : ''}
          {shown < total && `, ${shown.toLocaleString('en-US')} shown`}
        </p>
        <button type="button" disabled={active} onClick={() => void clearStops()}>
          Clear stops
        </button>
      </div>
      {shown > 0 && (
        <table className="bombe-stops">
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
                <td>{stop.wheelOrder}</td>
                <td className="letters">{stop.indicator}</td>
                <td className="letters">{stop.stecker ? `${stop.testRegister}/${stop.stecker}` : '—'}</td>
                <td>{verdicts[stop.verdict]}</td>
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
      {shown < total && shown > 0 && (
        <button type="button" onClick={() => void loadStops(true)}>
          Load more
        </button>
      )}
    </div>
  );
}
