import { useMachine } from '../store';
import { CheckingMachine } from './CheckingMachine';

/** The checking machine, set up by hand or by the Hut 8 notebook for a stop. */
export function CheckingView() {
  const checker = useMachine((store) => store.bombe?.checker);
  if (!checker) {
    return null;
  }

  const { stop } = checker;
  return (
    <div className="bombe-view checking">
      <div className="crib-controls">
        <p className="summary">
          {stop ? (
            <>
              Set up for stop {stop.index + 1}: {stop.wheelOrder}, indicator <span className="letters">{stop.indicator}</span>,{' '}
              {stop.stecker ? `${stop.testRegister}/${stop.stecker}` : 'no stecker'}. Write the steckers down in the Hut 8 notebook.
            </>
          ) : (
            'Drag drums and reflector cartridges from the racks onto the machine, or pick one and click its place. Drag a ring to set it; the thumbwheels turn the drums.'
          )}
        </p>
      </div>
      <CheckingMachine />
    </div>
  );
}
