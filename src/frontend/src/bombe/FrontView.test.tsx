import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { carterBombe, carterMenu, carterPaused } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { wheelOrdersOf } from './drums';
import { FrontView } from './FrontView';

const carter: BombeState = { ...carterMenu, settings: { ...carterMenu.settings, wheelOrders: ['II V III'] } };

describe('FrontView', () => {
  it('shows the menu on the first scramblers, set to their offsets, and the rest empty', async () => {
    renderBombe(<FrontView />, carter);

    const scramblers = await screen.findAllByRole('group', { name: /^Scrambler/ });
    expect(scramblers).toHaveLength(13);
    expect(scramblers[0]).toHaveAccessibleName('Scrambler 1: S–W at ZZA');
    expect(within(scramblers[12]).getByRole('img', { name: 'lower drum P' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Indicator AAA' })).toBeInTheDocument();
  });

  it('turns the drums to the stop the run is paused at and offers to continue', async () => {
    const api = renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('group', { name: 'Indicator DKX' })).toBeInTheDocument();
    const scramblers = screen.getAllByRole('group', { name: /^Scrambler/ });
    expect(within(scramblers[0]).getByRole('img', { name: 'lower drum D' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Stop on wheel order II V III: indicator DKX (core VMB). Test register G: stecker G/Q.');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.bombe.continueRun).toHaveBeenCalled());
  });

  it('shows the progress of the run', async () => {
    renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByLabelText('Run progress')).toHaveTextContent('Stopped · wheel order II V III · 0 of 1 wheel order done · 1 stop · 1:57');
    expect(screen.getByRole('progressbar', { name: 'Positions tested' })).toHaveAttribute('value', '1713');
  });

  it('spins the drums at full speed', async () => {
    renderBombe(<FrontView />, { ...carter, run: { ...carterPaused, status: 'Running', speed: null, pause: null, wheelOrder: null, position: null } });

    expect(await screen.findByRole('group', { name: 'Front of the Bombe' })).toHaveClass('spinning');
  });

  it('starts a run at the chosen speed', async () => {
    const api = renderBombe(<FrontView />, carter);
    const slider = await screen.findByRole('slider', { name: /Speed/ });
    fireEvent.change(slider, { target: { value: '40' } });
    fireEvent.pointerUp(slider);

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(api.bombe.startRun).toHaveBeenCalledWith(null));
  });

  it('changes the speed of the running run when the drag ends', async () => {
    const api = renderBombe(<FrontView />, { ...carter, run: carterPaused });
    const slider = await screen.findByRole('slider', { name: /Speed/ });

    fireEvent.change(slider, { target: { value: '20' } });
    fireEvent.change(slider, { target: { value: '40' } });

    expect(screen.getByText('Full speed')).toBeInTheDocument();
    expect(api.bombe.setRunSpeed).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider);
    await waitFor(() => expect(api.bombe.setRunSpeed).toHaveBeenCalledWith(null));
    expect(api.bombe.setRunSpeed).toHaveBeenCalledOnce();
  });

  it('stops a run and locks the settings while it runs', async () => {
    const api = renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('radio', { name: 'C' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => expect(api.bombe.cancelRun).toHaveBeenCalled());
  });

  it('runs the wheel orders of the ticked rotors', async () => {
    const api = renderBombe(<FrontView />, { ...carter, settings: { ...carter.settings, wheelOrders: wheelOrdersOf(['I', 'II', 'III', 'IV']) } });

    expect(await screen.findByLabelText('Wheel orders')).toHaveTextContent('24 wheel orders');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Rotor IV' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ wheelOrders: wheelOrdersOf(['I', 'II', 'III']) }));
  });

  it('keeps at least three rotors', async () => {
    renderBombe(<FrontView />, carter);

    expect(await screen.findByRole('checkbox', { name: 'Rotor V' })).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: 'Rotor I' })).toBeEnabled();
  });

  it('chooses the reflector', async () => {
    const api = renderBombe(<FrontView />, carter);

    fireEvent.click(await screen.findByRole('radio', { name: 'C' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ reflector: 'C' }));
  });

  it('asks for a menu before a run', async () => {
    renderBombe(<FrontView />, carterBombe);

    expect(await screen.findByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByText('Build a menu first.')).toBeInTheDocument();
  });
});
