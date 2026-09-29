import { useEffect, useState } from 'react';
import type { BackendStatus, EnigmaApi } from './api';
import { MachineFrame } from './MachineFrame';
import { Notebook } from './notebook/Notebook';
import { MachineStoreProvider } from './store';

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

export type Page = 'machine' | 'notebook';

/** The machine window, or the operator's notebook window. */
export function App({ api, page = 'machine' }: { api: EnigmaApi; page?: Page }) {
  const status = useBackendStatus(api);

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

  return (
    <MachineStoreProvider api={api}>{page === 'notebook' ? <Notebook /> : <MachineFrame />}</MachineStoreProvider>
  );
}
