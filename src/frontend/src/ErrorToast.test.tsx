import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorFadeMs, errorShownMs, ErrorToast } from './ErrorToast';
import { useMachine } from './store';
import { renderMachine } from './test/renderMachine';

/** A button that plugs a cable, which the fake API rejects. */
function Plug() {
  const connectPlug = useMachine((store) => store.connectPlug);
  return (
    <button type="button" onClick={() => void connectPlug('AA')}>
      Plug
    </button>
  );
}

async function renderToast() {
  renderMachine(
    <>
      <Plug />
      <ErrorToast className="error" />
    </>,
    undefined,
    // Each rejection arrives as a new object, as it does over IPC.
    (api) => api.machine.connectPlug.mockImplementation(() => Promise.resolve({ ok: false, problem: { status: 400, title: 'The operation was rejected.' } })),
  );
  await settle();
}

/** Lets the pending store calls finish. */
async function settle() {
  await act(async () => {
    for (let tick = 0; tick < 10; tick++) {
      await Promise.resolve();
    }
  });
}

async function reject() {
  fireEvent.click(screen.getByRole('button', { name: 'Plug' }));
  await settle();
}

describe('ErrorToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fades out and closes after a few seconds', async () => {
    await renderToast();
    await reject();

    expect(screen.getByRole('alert')).toHaveTextContent('The operation was rejected.');
    act(() => {
      vi.advanceTimersByTime(errorShownMs - 1);
    });
    expect(screen.getByRole('alert')).not.toHaveClass('error-fading');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('alert')).toHaveClass('error-fading');
    act(() => {
      vi.advanceTimersByTime(errorFadeMs);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows a new error for the full time again', async () => {
    await renderToast();
    await reject();
    act(() => {
      vi.advanceTimersByTime(errorShownMs - 1000);
    });

    await reject();
    act(() => {
      vi.advanceTimersByTime(errorShownMs - 1);
    });

    expect(screen.getByRole('alert')).not.toHaveClass('error-fading');
  });

  it('closes at once when dismissed', async () => {
    await renderToast();
    await reject();

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
