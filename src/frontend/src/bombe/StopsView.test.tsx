import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeRun, BombeState } from '../api';
import { stopPage, useMachine } from '../store';
import { carterMenu, carterPaused, carterStops } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { StopsView } from './StopsView';

const finished: BombeRun = { ...carterPaused, status: 'Finished', pause: null, wheelOrder: null, position: null, stops: 2 };
const carter: BombeState = { ...carterMenu, run: finished };

function ShownView() {
  return <output aria-label="Shown view">{useMachine((store) => store.bombeView)}</output>;
}

describe('StopsView', () => {
  it('asks for a run when there is none', async () => {
    renderBombe(<StopsView />, carterMenu);

    expect(await screen.findByText('No run yet. Start the Bombe on the Front tab.')).toBeInTheDocument();
  });

  it('lists the stops of the run', async () => {
    const api = renderBombe(<StopsView />, carter);

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('1II V IIIDKXVMBG/Q');
    expect(screen.getByText('2 stops')).toBeInTheDocument();
    expect(api.bombe.getStops).toHaveBeenCalledWith(0, stopPage);
  });

  it('loads more stops when not all are shown', async () => {
    const api = renderBombe(<StopsView />, { ...carter, run: { ...finished, stops: 250 } }, (fake) =>
      fake.bombe.getStops.mockResolvedValueOnce({ ok: true, value: Array.from({ length: stopPage }, (_, index) => ({ ...carterStops[0], index })) }),
    );
    expect(await screen.findByText('250 stops, 100 shown')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(api.bombe.getStops).toHaveBeenLastCalledWith(stopPage, stopPage));
  });

  it('opens the check of a stop on the Checking view', async () => {
    const api = renderBombe(
      <>
        <StopsView />
        <ShownView />
      </>,
      carter,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 2' }));

    await waitFor(() => expect(screen.getByLabelText('Shown view')).toHaveTextContent('bombe-checking'));
    expect(api.bombe.getCheck).toHaveBeenCalledWith(1);
  });
});
