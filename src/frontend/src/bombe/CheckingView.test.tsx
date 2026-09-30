import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { carterMenu, carterStops, emptyBombe, emptyChecker } from '../test/fakeApi';
import { click, dragTo } from '../test/pointer';
import { renderBombe } from '../test/renderBombe';
import { CheckingView } from './CheckingView';

/** The checking machine as the notebook sets it up for Carter's true stop. */
const carter: BombeState = { ...carterMenu, checker: { reflector: 'B', drums: ['II', 'V', 'III'], rings: 'DKX', windows: 'ZZZ', stop: carterStops[0] } };

describe('CheckingView', () => {
  it('shows the stop the notebook set it up for', async () => {
    renderBombe(<CheckingView />, carter);

    expect(await screen.findByText(/Set up for stop 1/)).toHaveTextContent('Set up for stop 1: II V III, indicator DKX, G/Q.');
    expect(screen.getByRole('img', { name: 'left drum II at Z, ring D' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'right drum III at Z, ring X' })).toBeInTheDocument();
  });

  it('starts empty, to be set up by hand', async () => {
    renderBombe(<CheckingView />, emptyBombe);

    expect(await screen.findByRole('button', { name: 'left drum place, empty' })).toBeInTheDocument();
    expect(screen.getByText(/Drag drums from the rack onto the machine/)).toBeInTheDocument();
  });

  it('fits a drum dragged from the rack', async () => {
    const api = renderBombe(<CheckingView />, emptyBombe);

    dragTo(await screen.findByRole('button', { name: 'Drum IV' }), screen.getByRole('button', { name: 'middle drum place, empty' }));

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ drums: [null, 'IV', null] }));
  });

  it('fits a drum picked in the rack, then its place', async () => {
    const api = renderBombe(<CheckingView />, { ...emptyBombe, checker: { ...emptyChecker, drums: ['I', null, null] } });

    expect(await screen.findByRole('button', { name: 'Drum I, fitted' })).toHaveAttribute('aria-disabled', 'true');
    click(screen.getByRole('button', { name: 'Drum VI' }));
    click(screen.getByRole('button', { name: 'right drum place, empty' }));

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ drums: ['I', null, 'VI'] }));
  });

  it('puts a clicked drum back in the rack', async () => {
    const api = renderBombe(<CheckingView />, carter);

    click(await screen.findByRole('button', { name: 'Take the middle drum V out' }));

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ drums: ['II', null, 'III'] }));
  });

  it('chooses the reflector', async () => {
    const api = renderBombe(<CheckingView />, carter);

    fireEvent.click(await screen.findByRole('radio', { name: 'C' }));

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ reflector: 'C' }));
  });

  it('lights the lamp of a pressed key while it is held', async () => {
    const api = renderBombe(<CheckingView />, carter);
    await screen.findByRole('group', { name: 'Checking machine' });

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(screen.getByRole('img', { name: 'Lamp R, lit' })).toBeInTheDocument());
    expect(api.bombe.pressCheckerKey).toHaveBeenCalledWith('Q');

    fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(screen.queryByRole('img', { name: 'Lamp R, lit' })).not.toBeInTheDocument());
  });

  it('presses no key while a drum is missing', async () => {
    const api = renderBombe(<CheckingView />, { ...emptyBombe, checker: { ...emptyChecker, drums: ['I', null, 'III'] } });
    await screen.findByRole('group', { name: 'Checking machine' });

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });

    expect(api.bombe.pressCheckerKey).not.toHaveBeenCalled();
  });

  it('turns a drum by its thumbwheel', async () => {
    const api = renderBombe(<CheckingView />, carter);

    fireEvent.click(await screen.findByTestId('thumbwheel-right-up'));

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ windows: 'ZZA' }));
  });

  it('turns a ring with the arrow keys', async () => {
    const api = renderBombe(<CheckingView />, carter);
    const ring = await screen.findByRole('spinbutton', { name: 'middle ring' });
    expect(ring).toHaveAttribute('aria-valuetext', 'K');

    fireEvent.keyDown(ring, { key: 'ArrowDown' });

    await waitFor(() => expect(api.bombe.setChecker).toHaveBeenCalledWith({ rings: 'DJX' }));
  });
});
