import { useEffect } from 'react';
import { InstructionsIcon } from '../components/icons';
import { TabbedViews } from '../components/TabbedViews';
import { ErrorToast } from '../ErrorToast';
import { ModeSwitch, useActive } from '../mode';
import { useMachine } from '../store';
import { CribView } from './CribView';
import { MenuView } from './MenuView';
import { MessageView } from './MessageView';

const views = [
  { id: 'bombe-message', label: 'Message', View: MessageView },
  { id: 'bombe-crib', label: 'Crib', View: CribView },
  { id: 'bombe-menu', label: 'Menu', View: MenuView },
] as const;

/** The Bombe mode: breaks Enigma messages from a crib. The job loads when the mode is first shown. */
export function BombeFrame() {
  const version = useMachine((store) => store.version);
  const openInstructions = useMachine((store) => store.openInstructions);
  const loadBombe = useMachine((store) => store.loadBombe);
  const loaded = useMachine((store) => store.bombe !== null);
  const active = useActive();

  useEffect(() => {
    if (active && !loaded) {
      void loadBombe();
    }
  }, [active, loaded, loadBombe]);

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
      <ErrorToast className="error" />
      <TabbedViews label="Bombe views" views={views} />
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
