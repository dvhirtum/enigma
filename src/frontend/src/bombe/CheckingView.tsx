import { useMachine } from '../store';
import { CheckingMachine } from './CheckingMachine';

/** The checking machine, set up for the stop picked in the Hut 8 notebook, where the steckers are written down. */
export function CheckingView() {
  const check = useMachine((store) => store.check);

  if (!check) {
    return (
      <div className="bombe-view">
        <p className="bombe-empty">No stop picked. Choose one in the Hut 8 notebook.</p>
      </div>
    );
  }

  const { stop } = check;
  return (
    <div className="bombe-view checking">
      <p className="summary">
        Stop {stop.index + 1}: {stop.wheelOrder}, indicator <span className="letters">{stop.indicator}</span>,{' '}
        {stop.stecker ? `${stop.testRegister}/${stop.stecker}` : 'no stecker'}. Write the steckers down in the Hut 8 notebook.
      </p>
      <CheckingMachine />
    </div>
  );
}
