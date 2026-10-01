import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { carterMenu, carterPaused, carterPrinted } from '../test/fakeApi';
import { click, dragTo } from '../test/pointer';
import { renderBombe } from '../test/renderBombe';
import { FrontView } from './FrontView';

const carter: BombeState = carterMenu;

const scrambler = (chain: number, index: number) => screen.findByRole('group', { name: new RegExp(`^Chain ${chain} scrambler ${index}:`) });

describe('FrontView', () => {
  it('shows the drums of each chain at their start letters, with the cables of their scramblers', async () => {
    renderBombe(<FrontView />, carter);

    const first = await scrambler(1, 1);
    expect(first).toHaveAccessibleName('Chain 1 scrambler 1: SW');
    expect(within(first).getByRole('spinbutton', { name: 'lower drum III at A' })).toBeInTheDocument();
    expect(within(await scrambler(2, 1)).getByRole('spinbutton', { name: 'lower drum III at P' })).toBeInTheDocument();
    expect(within(await scrambler(2, 2)).getByRole('spinbutton', { name: 'upper drum empty' })).toBeInTheDocument();
    expect(screen.getByText('Chains 1–2 · II V III')).toBeInTheDocument();
    expect(screen.getByText('Chain 2 · joined to chain 1')).toBeInTheDocument();
    expect(screen.getByText('Chain 3 · no drums')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Indicator AAA' })).toBeInTheDocument();
  });

  it('fills a row up to the drum clicked after picking a rotor in the rack', async () => {
    const api = renderBombe(<FrontView />, carter);
    click(await screen.findByRole('button', { name: 'Drums I' }));

    click(within(await scrambler(3, 5)).getByRole('spinbutton', { name: 'upper drum empty' }));

    await waitFor(() => expect(api.bombe.fitRow).toHaveBeenCalledWith(2, 0, 4, 'I'));
  });

  it('fills a row up to the drum a rotor is dragged onto', async () => {
    const api = renderBombe(<FrontView />, carter);
    const rack = await screen.findByRole('button', { name: 'Drums IV' });

    dragTo(rack, within(await scrambler(3, 9)).getByRole('spinbutton', { name: 'middle drum empty' }));

    await waitFor(() => expect(api.bombe.fitRow).toHaveBeenCalledWith(2, 1, 8, 'IV'));
  });

  it('takes out a drum that is clicked', async () => {
    const api = renderBombe(<FrontView />, carter);

    click(within(await scrambler(1, 4)).getByRole('spinbutton', { name: 'middle drum V at Z' }));

    await waitFor(() => expect(api.bombe.removeDrum).toHaveBeenCalledWith(0, 3, 1));
  });

  it('turns a drum by hand with the arrow keys', async () => {
    const api = renderBombe(<FrontView />, carter);

    fireEvent.keyDown(within(await scrambler(1, 3)).getByRole('spinbutton', { name: 'lower drum III at E' }), { key: 'ArrowUp' });

    await waitFor(() => expect(api.bombe.turnScrambler).toHaveBeenCalledWith(0, 2, 'ZZF'));
  });

  it('turns the drums and the indicator to the stop the run is paused at', async () => {
    renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('group', { name: 'Indicator DKX' })).toBeInTheDocument();
    expect(within(await scrambler(1, 1)).getByRole('img', { name: 'lower drum III at D' })).toBeInTheDocument();
  });

  it('spins the drums at full speed', async () => {
    renderBombe(<FrontView />, { ...carter, run: { ...carterPaused, status: 'Running', speed: null, pause: null, position: null } });

    expect(await screen.findByRole('group', { name: 'Front of the Bombe' })).toHaveClass('spinning');
  });

  it('prints the stops with their live wires, and clears the printout', async () => {
    const api = renderBombe(<FrontView />, { ...carter, printed: 1 });

    const printout = await screen.findByRole('region', { name: 'Printout' });
    await waitFor(() => expect(within(printout).getAllByRole('row')).toHaveLength(2));
    const row = within(printout).getAllByRole('row')[1];
    expect(row).toHaveTextContent(['1', '1–2', 'II V III', carterPrinted.indicator, 'G', 'ABCDEFGHIJKLMNOP·RSTUVWXYZ', 'G/Q'].join(''));

    fireEvent.click(within(printout).getByRole('button', { name: 'Clear printout' }));

    await waitFor(() => expect(api.bombe.clearPrintout).toHaveBeenCalled());
  });
});
