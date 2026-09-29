import { InstructionsIcon } from '../components/icons';
import { ModeSwitch } from '../mode';
import { useMachine } from '../store';

/** The Bombe mode: breaks Enigma messages from a crib. */
export function BombeFrame() {
  const version = useMachine((store) => store.version);
  const openInstructions = useMachine((store) => store.openInstructions);

  return (
    <div className="frame">
      <header>
        <ModeSwitch />
        <div className="panel-toggles">
          <button type="button" className="panel-toggle" aria-label="Instructions" title="Instructions" onClick={() => void openInstructions()}>
            <InstructionsIcon />
          </button>
        </div>
      </header>
      <main aria-label="Bombe" className="bombe">
        <p>The Bombe finds the Enigma key of a message from a crib: a guessed piece of its plaintext.</p>
      </main>
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
