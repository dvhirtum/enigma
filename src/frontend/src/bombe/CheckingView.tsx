import { useMachine } from '../store';
import { CheckingMachine } from './CheckingMachine';

/** The checking machine, set up by hand or by the Hut 8 notebook for a stop, with its reflector. */
export function CheckingView() {
  const checker = useMachine((store) => store.bombe?.checker);
  const setChecker = useMachine((store) => store.setChecker);
  if (!checker) {
    return null;
  }

  const { stop } = checker;
  return (
    <div className="bombe-view checking">
      <div className="crib-controls">
        <div className="run-settings">
          <fieldset>
            <legend>Reflector</legend>
            {['B', 'C'].map((reflector) => (
              <label key={reflector}>
                <input type="radio" name="checker-reflector" checked={checker.reflector === reflector} onChange={() => void setChecker({ reflector })} />
                {reflector}
              </label>
            ))}
          </fieldset>
        </div>
        <p className="summary">
          {stop ? (
            <>
              Set up for stop {stop.index + 1}: {stop.wheelOrder}, indicator <span className="letters">{stop.indicator}</span>,{' '}
              {stop.stecker ? `${stop.testRegister}/${stop.stecker}` : 'no stecker'}. Write the steckers down in the Hut 8 notebook.
            </>
          ) : (
            'Drag drums from the rack onto the machine, or pick one and click its place. Drag a ring to set it; the thumbwheels turn the drums.'
          )}
        </p>
      </div>
      <CheckingMachine />
    </div>
  );
}
