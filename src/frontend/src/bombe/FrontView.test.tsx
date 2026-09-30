import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { carterBombe, carterMenu, carterPaused } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { FrontView } from './FrontView';

const carter: BombeState = carterMenu;

describe('FrontView', () => {
  it('shows the copy of the menu on its chains, with its drums at their offsets, and the rest empty', async () => {
    renderBombe(<FrontView />, carter);

    const scramblers = await screen.findAllByRole('group', { name: /^Copy/ });
    expect(scramblers).toHaveLength(13);
    expect(scramblers[0]).toHaveAccessibleName('Copy 1 scrambler 1: S–W at ZZA');
    expect(within(scramblers[12]).getByRole('spinbutton', { name: 'lower drum III at P' })).toBeInTheDocument();
    expect(screen.getByText('Chains 1–2 · II V III')).toBeInTheDocument();
    expect(screen.getByText("The menu's 13 links take 2 chains, so one wheel order runs at a time.", { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Chain 3 · not in use')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Indicator AAA' })).toBeInTheDocument();
  });

  it('fits drums in a row of the copy when a rotor is picked', async () => {
    const api = renderBombe(<FrontView />, carter);
    const scramblers = await screen.findAllByRole('group', { name: /^Copy/ });

    fireEvent.click(within(scramblers[4]).getByRole('spinbutton', { name: 'upper drum II at Z' }));
    const picker = screen.getByRole('dialog', { name: 'Drums for the upper row of chains 1–2' });
    expect(within(picker).getByRole('button', { name: 'V' })).toBeDisabled();
    fireEvent.click(within(picker).getByRole('button', { name: 'I' }));

    await waitFor(() => expect(api.bombe.fitDrums).toHaveBeenCalledWith(0, 0, 'I'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('turns a drum by hand with the arrow keys', async () => {
    const api = renderBombe(<FrontView />, carter);
    const scramblers = await screen.findAllByRole('group', { name: /^Copy/ });

    fireEvent.keyDown(within(scramblers[2]).getByRole('spinbutton', { name: 'lower drum III at E' }), { key: 'ArrowUp' });

    await waitFor(() => expect(api.bombe.turnScrambler).toHaveBeenCalledWith(0, 2, 'ZZF'));
  });

  it('asks for drums in every row of a copy before a run', async () => {
    renderBombe(<FrontView />, { ...carter, machine: { chainsPerCopy: 2, copies: [{ ...carter.machine!.copies[0], drums: ['II', null, 'III'] }] } });

    expect(await screen.findByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByText('Fit drums in all three rows of chains 1–2, or take them all out.')).toBeInTheDocument();
  });

  it('turns the drums to the stop the run is paused at and offers to continue', async () => {
    const api = renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByRole('group', { name: 'Indicator DKX' })).toBeInTheDocument();
    const scramblers = screen.getAllByRole('group', { name: /^Copy/ });
    expect(within(scramblers[0]).getByRole('img', { name: 'lower drum III at D' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Stop on wheel order II V III: indicator DKX. Test register G: stecker G/Q.');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(api.bombe.continueRun).toHaveBeenCalled());
  });

  it('shows the progress of the run', async () => {
    renderBombe(<FrontView />, { ...carter, run: carterPaused });

    expect(await screen.findByLabelText('Run progress')).toHaveTextContent('Stopped · II V III · 1,713 of 17,576 positions · 1 stop · 1:57');
    expect(screen.getByRole('progressbar', { name: 'Positions tested' })).toHaveAttribute('value', '1713');
  });

  it('spins the drums at full speed', async () => {
    renderBombe(<FrontView />, { ...carter, run: { ...carterPaused, status: 'Running', speed: null, pause: null, position: null } });

    expect(await screen.findByRole('group', { name: 'Front of the Bombe' })).toHaveClass('spinning');
  });

  it('keeps the drums of a copy without drums still while the Bombe runs', async () => {
    const menu = { ...carter.menu!, links: ['SW1', 'NE2'] };
    const machine = {
      chainsPerCopy: 1,
      copies: [
        { drums: ['II', 'V', 'III'], starts: ['ZZA', 'ZZB'] },
        { drums: [null, null, null], starts: ['ZZA', 'ZZB'] },
        { drums: [null, null, null], starts: ['ZZA', 'ZZB'] },
      ],
    };
    renderBombe(<FrontView />, { ...carter, menu, machine, run: { ...carterPaused, status: 'Running', speed: 14.6, pause: null, position: 'WPC' } });

    const tested = await screen.findByRole('group', { name: /^Copy 1 scrambler 1:/ });
    const idle = screen.getByRole('group', { name: /^Copy 2 scrambler 1:/ });
    expect(screen.getByText('Chain 2 · no drums')).toBeInTheDocument();
    expect(screen.getByText('each chain runs the menu with its own drums: 3 wheel orders in one run.', { exact: false })).toBeInTheDocument();
    expect(within(tested).getByRole('img', { name: 'lower drum III at D' })).not.toHaveClass('idle');
    expect(within(idle).getByRole('img', { name: 'lower drum empty at A' })).toHaveClass('idle');
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

  it('chooses the reflector', async () => {
    const api = renderBombe(<FrontView />, carter);

    fireEvent.click(await screen.findByRole('radio', { name: 'C' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ reflector: 'C' }));
  });

  it('asks for a menu before a run', async () => {
    renderBombe(<FrontView />, carterBombe);

    expect(await screen.findByRole('button', { name: 'Start' })).toBeDisabled();
    expect(screen.getByText('Draw a menu in the Hut 8 notebook first.')).toBeInTheDocument();
  });
});
