import { useEffect, useState } from 'react';
import type { EnigmaApi } from './api';

type Status =
  | { state: 'connecting' }
  | { state: 'connected'; version: string }
  | { state: 'failed'; message: string };

export function App({ api }: { api: EnigmaApi }) {
  const [status, setStatus] = useState<Status>({ state: 'connecting' });

  useEffect(() => {
    api.health().then(
      (health) => setStatus({ state: 'connected', version: health.version }),
      (error: unknown) => setStatus({ state: 'failed', message: String(error) }),
    );
  }, [api]);

  return (
    <main>
      <h1>Enigma</h1>
      <p role="status">
        {status.state === 'connecting' && 'Connecting to backend...'}
        {status.state === 'connected' && `Backend connected (v${status.version})`}
        {status.state === 'failed' && `Backend unavailable: ${status.message}`}
      </p>
    </main>
  );
}
