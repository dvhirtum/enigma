import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { carterMenu, carterPaused, emptyBombe, emptyMachine } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { SideView } from './SideView';

const carter: BombeState = carterMenu;

describe('SideView', () => {
  it('asks for a test register before a run, and lists what the run will not use', async () => {
    renderBombe(<SideView />, { ...emptyBombe, machine: { ...emptyMachine(), warnings: ['Chain 1, scrambler 1 has drums but no cables.'] } });

    expect(await screen.findByRole('button', { name: 'Start' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('Plug a test register onto a common on the Back tab.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Warnings' })).toHaveTextContent('Chain 1, scrambler 1 has drums but no cables.');
  });

  it('continues only at a stop', async () => {
    renderBombe(<SideView />, carter);

    expect(await screen.findByRole('button', { name: 'Continue' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('img', { name: 'Stop lamp' })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows the stop the run is paused at on the test register, and continues', async () => {
    const api = renderBombe(<SideView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('img', { name: 'Stop lamp, lit' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Live wires ABCDEFGHIJKLMNOPRSTUVWXYZ' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Chains 1–2 · II V III');
    expect(screen.getByRole('status')).toHaveTextContent('Stecker G/Q');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.bombe.continueRun).toHaveBeenCalled());
  });

  it('shows the progress of the run', async () => {
    renderBombe(<SideView />, { ...carter, run: carterPaused });

    expect(await screen.findByLabelText('Run progress')).toHaveTextContent(
      'Stopped · Chains 1–2 II V III · 1,713 of 17,576 positions · 1 stop · 1:57 · stops go to the Hut 8 notebook',
    );
    expect(screen.getByRole('progressbar', { name: 'Positions tested' })).toHaveAttribute('value', '1713');
  });

  it('starts a run at the chosen speed', async () => {
    const api = renderBombe(<SideView />, carter);
    const knob = await screen.findByRole('slider', { name: 'Speed' });
    fireEvent.keyDown(knob, { key: 'End' });
    fireEvent.keyUp(knob, { key: 'End' });

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => expect(api.bombe.startRun).toHaveBeenCalledWith(null));
  });

  it('changes the speed of the running run when the key press ends', async () => {
    const api = renderBombe(<SideView />, { ...carter, run: carterPaused });
    const knob = await screen.findByRole('slider', { name: 'Speed' });

    fireEvent.keyDown(knob, { key: 'PageUp' });
    fireEvent.keyDown(knob, { key: 'End' });

    expect(knob).toHaveAttribute('aria-valuetext', 'Full speed');
    expect(screen.getByText('Full speed')).toBeInTheDocument();
    expect(api.bombe.setRunSpeed).not.toHaveBeenCalled();
    fireEvent.keyUp(knob, { key: 'End' });
    await waitFor(() => expect(api.bombe.setRunSpeed).toHaveBeenCalledWith(null));
    expect(api.bombe.setRunSpeed).toHaveBeenCalledOnce();
  });

  it('stops a run and locks the settings while it runs', async () => {
    const api = renderBombe(<SideView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('radio', { name: 'C' })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Start' })).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));

    await waitFor(() => expect(api.bombe.cancelRun).toHaveBeenCalled());
  });

  it('chooses the reflector', async () => {
    const api = renderBombe(<SideView />, carter);

    fireEvent.click(await screen.findByRole('radio', { name: 'C' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ reflector: 'C' }));
  });
  it('switches the diagonal board off', async () => {
    const api = renderBombe(<SideView />, emptyBombe);

    const board = await screen.findByRole('switch', { name: 'Diagonal board' });
    expect(board).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(board);

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ diagonalBoard: false }));
  });
});
