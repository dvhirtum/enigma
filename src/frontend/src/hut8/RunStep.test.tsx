import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BombeRun, BombeState } from '../api';
import { stopPage, useMachine } from '../store';
import { carterMenu, carterPaused, carterStops } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { RunStep, StopsStep } from './RunStep';

const finished: BombeRun = { ...carterPaused, status: 'Finished', pause: null, position: null, stops: 2, allStops: 2 };
const carter: BombeState = { ...carterMenu, run: finished, stops: 2 };

function ShownView() {
  return <output aria-label="Shown view">{useMachine((store) => store.bombeView)}</output>;
}

describe('RunStep', () => {
  it('says what the Bombe still needs', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, machine: { chainsPerCopy: 2, copies: [{ ...carterMenu.machine!.copies[0], drums: [null, null, null] }] } });

    expect(await screen.findByText('Click a drum to fit drums in its row.')).toBeInTheDocument();
  });

  it('follows the run', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, run: carterPaused, stops: 1 });

    expect(await screen.findByLabelText('Run progress')).toHaveTextContent(/^Stopped · II V III/);
  });

  it('lets the stops be checked while the run goes on', async () => {
    const onDone = vi.fn();
    renderBombe(<RunStep onDone={onDone} />, { ...carterMenu, run: carterPaused, stops: 1 });

    fireEvent.click(await screen.findByRole('button', { name: 'Check the stops found so far' }));

    expect(onDone).toHaveBeenCalledOnce();
  });

  it('says when a run found no stops', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, run: { ...finished, stops: 0, allStops: 0 }, stops: 0 });

    expect(await screen.findByText(/No stops\./)).toBeInTheDocument();
  });
});

describe('StopsStep', () => {
  it('lists the stops of the run', async () => {
    const api = renderBombe(<StopsStep />, carter);

    const rows = await screen.findAllByRole('row');
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent('1II V IIIDKXG/Q');
    expect(screen.getByText(/2 stops\./)).toBeInTheDocument();
    expect(api.bombe.getStops).toHaveBeenCalledWith(0, stopPage);
  });

  it('lists the stops of earlier runs when the latest run is gone', async () => {
    renderBombe(<StopsStep />, { ...carter, run: null });

    expect(await screen.findAllByRole('row')).toHaveLength(3);
  });

  it('clears the stops', async () => {
    const api = renderBombe(<StopsStep />, carter);
    await screen.findAllByRole('row');

    fireEvent.click(screen.getByRole('button', { name: 'Clear stops' }));

    await waitFor(() => expect(api.bombe.clearStops).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryAllByRole('row')).toHaveLength(0));
  });

  it('loads more stops when not all are written down', async () => {
    const api = renderBombe(<StopsStep />, { ...carter, run: { ...finished, stops: 250, allStops: 250 }, stops: 250 }, (fake) =>
      fake.bombe.getStops.mockResolvedValueOnce({ ok: true, value: Array.from({ length: stopPage }, (_, index) => ({ ...carterStops[0], index })) }),
    );
    expect(await screen.findByText(/250 stops, 100 written down/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(api.bombe.getStops).toHaveBeenLastCalledWith(stopPage, stopPage));
  });

  it('opens the check of a stop on the Checking view', async () => {
    const api = renderBombe(
      <>
        <StopsStep />
        <ShownView />
      </>,
      carter,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 2' }));

    await waitFor(() => expect(screen.getByLabelText('Shown view')).toHaveTextContent('bombe-checking'));
    expect(api.bombe.getCheck).toHaveBeenCalledWith(1);
  });
});
