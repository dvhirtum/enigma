import { useEffect } from 'react';
import { Hut8Icon, InstructionsIcon } from '../components/icons';
import { TabbedViews } from '../components/TabbedViews';
import { ErrorToast } from '../ErrorToast';
import { ModeSwitch, useActive } from '../mode';
import { useMachine } from '../store';
import { BackView } from './BackView';
import { CheckingView } from './CheckingView';
import { FrontView } from './FrontView';
import { SideView } from './SideView';

const views = [
  { id: 'bombe-front', label: 'Front', View: FrontView },
  { id: 'bombe-side', label: 'Side', View: SideView },
  { id: 'bombe-back', label: 'Back', View: BackView },
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
/** The Bombe mode: the Bombe and the checking machine. The message, crib and menu are worked in the Hut 8 notebook. The job loads when the mode is first shown. */
export function BombeFrame() {
  const version = useMachine((store) => store.version);
  const openInstructions = useMachine((store) => store.openInstructions);
  const openHut8Notebook = useMachine((store) => store.openHut8Notebook);
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
          <button type="button" className="panel-toggle" aria-label="Hut 8 notebook" title="Hut 8 notebook" onClick={() => void openHut8Notebook()}>
            <Hut8Icon />
          </button>
        </div>
      </header>
      <ErrorToast className="error" />
      <TabbedViews label="Bombe views" views={views} selectedId={view} onSelect={showBombeView} />
      <footer>{version && `Backend v${version}`}</footer>
    </div>
  );
}
