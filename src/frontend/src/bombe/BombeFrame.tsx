import { useEffect } from 'react';
import { InstructionsIcon } from '../components/icons';
import { TabbedViews } from '../components/TabbedViews';
import { ErrorToast } from '../ErrorToast';
import { ModeSwitch, useActive } from '../mode';
import { useMachine } from '../store';
import { BackView } from './BackView';
import { CheckingView } from './CheckingView';
import { CribView } from './CribView';
import { FrontView } from './FrontView';
import { MenuView } from './MenuView';
import { MessageView } from './MessageView';
import { StopsView } from './StopsView';

const views = [
  { id: 'bombe-message', label: 'Message', View: MessageView },
  { id: 'bombe-crib', label: 'Crib', View: CribView },
  { id: 'bombe-menu', label: 'Menu', View: MenuView },
  { id: 'bombe-front', label: 'Front', View: FrontView },
  { id: 'bombe-back', label: 'Back', View: BackView },
  { id: 'bombe-stops', label: 'Stops', View: StopsView },
  { id: 'bombe-checking', label: 'Checking', View: CheckingView },
] as const;

/** How often a running run is polled: often while paced, to turn the drums, less at full speed. */
const pacedPoll = 100;
const fullSpeedPoll = 250;

/** Polls the run while it is running, in either mode. */
function useRunPolling() {
  const running = useMachine((store) => store.bombe?.run?.status === 'Running');
  const fullSpeed = useMachine((store) => store.bombe?.run?.speed === null);
  const pollRun = useMachine((store) => store.pollRun);

  useEffect(() => {
    if (!running) {
      return;
    }
    const timer = setInterval(() => void pollRun(), fullSpeed ? fullSpeedPoll : pacedPoll);
    return () => clearInterval(timer);
  }, [running, fullSpeed, pollRun]);
}
/** The Bombe mode: breaks Enigma messages from a crib. The job loads when the mode is first shown. */
export function BombeFrame() {
  const version = useMachine((store) => store.version);
  const openInstructions = useMachine((store) => store.openInstructions);
  const loadBombe = useMachine((store) => store.loadBombe);
  const loaded = useMachine((store) => store.bombe !== null);
  const view = useMachine((store) => store.bombeView);
  const showBombeView = useMachine((store) => store.showBombeView);
  const active = useActive();
  useRunPolling();

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
      <TabbedViews label="Bombe views" views={views} selectedId={view} onSelect={showBombeView} />
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
