import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BombeRun, BombeState } from '../api';
import { stopPage } from '../store';
import { carterMenu, carterPaused, carterStops, emptyMachine } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { RunStep, StopsStep } from './RunStep';

const finished: BombeRun = { ...carterPaused, status: 'Finished', pause: null, position: null, stops: 2, allStops: 2 };
const carter: BombeState = { ...carterMenu, run: finished, stops: 2 };

describe('RunStep', () => {
  it('says what the Bombe still needs', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, machine: { ...emptyMachine(), pluggedForMenu: true } });

    expect(await screen.findByText('Plug a test register onto a common on the Back tab.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Plug it up again' })).not.toBeInTheDocument();
  });

  it('follows the run', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, run: carterPaused, stops: 1 });

    expect(await screen.findByLabelText('Run progress')).toHaveTextContent(/^Stopped · Chains 1–2 II V III/);
  });

  it('lets the stops be checked while the run goes on', async () => {
    const onDone = vi.fn();
    renderBombe(<RunStep onDone={onDone} />, { ...carterMenu, run: carterPaused, stops: 1 });

    fireEvent.click(await screen.findByRole('button', { name: 'Check the stops found so far' }));

    expect(onDone).toHaveBeenCalledOnce();
  });

  it('plugs up the menu again when the Bombe was changed by hand', async () => {
    const api = renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, machine: { ...carterMenu.machine, pluggedForMenu: false, pluggedByHand: true } });

    expect(await screen.findByText(/The Bombe is no longer plugged up for this menu/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Plug it up again' }));

    await waitFor(() => expect(api.bombe.plugUpMenu).toHaveBeenCalled());
  });

  it('asks for the wheel orders the other Wrens have not ruled out', async () => {
    const api = renderBombe(<RunStep onDone={vi.fn()} />, carterMenu);

    fireEvent.click(await screen.findByRole('button', { name: 'Wheel orders already ruled out' }));

    await waitFor(() => expect(api.bombe.showWheelOrders).toHaveBeenCalledOnce());
  });

  it('writes down the three wheel orders once shown', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, source: { ...carterMenu.source!, wheelOrders: ['II V III', 'VI III VIII', 'IV I VII'] } });

    expect(await screen.findByLabelText('Wheel orders left')).toHaveTextContent("One of these is the key's: II V III, VI III VIII or IV I VII.");
    expect(screen.queryByRole('button', { name: 'Wheel orders already ruled out' })).not.toBeInTheDocument();
  });

  it('offers no wheel orders for pasted text', async () => {
    renderBombe(<RunStep onDone={vi.fn()} />, { ...carterMenu, source: { ...carterMenu.source!, kind: 'Pasted', hasWheelOrders: false } });

    expect(await screen.findByText(/is plugged up with the menu/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Wheel orders already ruled out' })).not.toBeInTheDocument();
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

  it('opens the check of a stop', async () => {
    const api = renderBombe(<StopsStep />, carter);

    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 2' }));

    await waitFor(() => expect(api.bombe.getCheck).toHaveBeenCalledWith(1));
  });
});
