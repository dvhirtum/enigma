import { useEffect, useState } from 'react';
import type { BackendStatus, EnigmaApi } from './api';
import { BombeFrame } from './bombe/BombeFrame';
import { MachineFrame } from './MachineFrame';
import { ActiveContext, ModeProvider, type Mode } from './mode';
import { Notebook } from './notebook/Notebook';
import { MachineStoreProvider } from './store';
import { InstructionsView } from './views/InstructionsView';

function useBackendStatus(api: EnigmaApi): BackendStatus {
  const [status, setStatus] = useState<BackendStatus>({ state: 'starting' });

  useEffect(() => {
    let pushed = false;
    const unsubscribe = api.backend.onStatus((next) => {
      pushed = true;
      setStatus(next);
    });
    void api.backend.status().then((current) => {
      if (!pushed) {
        setStatus(current);
      }
    });
    return unsubscribe;
  }, [api]);

  return status;
}

export type Page = 'machine' | 'notebook' | 'instructions';

/** The machine window, the operator's notebook window, or the instructions window. */
export function App({ api, page = 'machine' }: { api: EnigmaApi; page?: Page }) {
  const status = useBackendStatus(api);

  if (page === 'instructions') {
    return (
      <div className="instructions-window">
        <InstructionsView />
      </div>
    );
  }

  if (status.state === 'starting') {
    return (
      <div className="screen">
        <p role="status">Starting the machine...</p>
      </div>
    );
  }

  if (status.state === 'failed') {
    return (
      <div className="screen" role="alert">
        <h1>The backend stopped</h1>
        <p>{status.message}</p>
        <button type="button" onClick={() => void api.backend.restart()}>
          Restart
        </button>
      </div>
    );
  }

  return <MachineStoreProvider api={api}>{page === 'notebook' ? <Notebook /> : <Modes />}</MachineStoreProvider>;
}

const titles: Record<Mode, string> = { enigma: 'Enigma', bombe: 'Bombe' };

/** The Enigma and Bombe frames. Both stay mounted, so each keeps its state while the other is shown. */
function Modes() {
  const [mode, setMode] = useState<Mode>('enigma');

  useEffect(() => {
    document.title = titles[mode];
  }, [mode]);

  return (
    <ModeProvider value={{ mode, setMode }}>
      {(['enigma', 'bombe'] as const).map((frame) => (
        <div key={frame} className="mode-frame" hidden={frame !== mode}>
          <ActiveContext.Provider value={frame === mode}>{frame === 'enigma' ? <MachineFrame /> : <BombeFrame />}</ActiveContext.Provider>
        </div>
      ))}
    </ModeProvider>
  );
}
