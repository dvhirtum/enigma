import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BombeState } from '../api';
import { ModeProvider } from '../mode';
import { carterMenu, carterPaused } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { CheckingView } from './CheckingView';
import { StopsView } from './StopsView';

const carter: BombeState = { ...carterMenu, run: { ...carterPaused, status: 'Finished', pause: null, stops: 2, allStops: 2 }, stops: 2 };

/** Renders the Stops and Checking views and opens the check of Carter's true stop. */
async function openCarterCheck(setMode = vi.fn()) {
  const api = renderBombe(
    <ModeProvider value={{ mode: 'bombe', setMode }}>
      <StopsView />
      <CheckingView />
    </ModeProvider>,
    carter,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Check stop 1' }));
  await screen.findByRole('group', { name: 'Checking machine' });
  return api;
}

describe('CheckingView', () => {
  it('asks for a stop when none is picked', async () => {
    renderBombe(<CheckingView />, carter);

    expect(await screen.findByText('No stop picked. Pick one on the Stops tab.')).toBeInTheDocument();
  });

  it('sets the checking machine to the stop and shows the crib and steckers', async () => {
    await openCarterCheck();

    expect(screen.getByText(/Stop 1: II V III, indicator/)).toHaveTextContent('Stop 1: II V III, indicator DKX, G/Q');
    expect(screen.getByRole('img', { name: 'left drum II at Z, ring D' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'right drum III at Z, ring X' })).toBeInTheDocument();
    expect(screen.getByLabelText('Partner of G')).toHaveValue('Q');
    expect(screen.getByLabelText('Partner of A')).toHaveValue('');
    expect(screen.getByLabelText('Decrypt')).toHaveTextContent('????? ????? ????? ?');
  });

  it('lights the lamp of a pressed key while it is held', async () => {
    const api = await openCarterCheck();

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(screen.getByRole('img', { name: 'Lamp R, lit' })).toBeInTheDocument());
    expect(api.bombe.pressCheckKey).toHaveBeenCalledWith(0, 'Q');

    fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(screen.queryByRole('img', { name: 'Lamp R, lit' })).not.toBeInTheDocument());
  });

  it('turns a drum by its thumbwheel', async () => {
    const api = await openCarterCheck();

    fireEvent.click(screen.getByTestId('thumbwheel-right-up'));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { machineWindows: 'ZZA' }));
  });

  it('starts with the rings at the indicator and turns a ring with the arrow keys', async () => {
    const api = await openCarterCheck();
    const ring = screen.getByRole('spinbutton', { name: 'middle ring' });
    expect(ring).toHaveAttribute('aria-valuetext', 'K');

    fireEvent.keyDown(ring, { key: 'ArrowDown' });

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { machineRings: 'DJX' }));
  });

  it('lists the menu links with the drum position of each', async () => {
    await openCarterCheck();

    const links = within(screen.getByRole('region', { name: 'Menu links' })).getAllByRole('listitem');
    expect(links[0]).toHaveTextContent(/1\s*S–W\s*ZZA/);
    expect(links.map((link) => link.textContent)).toContain('5G–EZZE');
  });

  it('writes a pair into the steckers when a partner is typed', async () => {
    const api = await openCarterCheck();

    fireEvent.change(screen.getByLabelText('Partner of A'), { target: { value: 'd' } });

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'AD GQ' }));
  });

  it('takes the new partner when it is typed in front of the old one', async () => {
    const api = await openCarterCheck();

    fireEvent.change(screen.getByLabelText('Partner of G'), { target: { value: 'XQ' } });

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'GX' }));
  });

  it('turns the right ring by hand', async () => {
    const api = await openCarterCheck();

    fireEvent.click(screen.getByRole('button', { name: 'Next ring' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { rightRing: 1 }));
  });

  it('finds the right ring and says when the rings tie', async () => {
    const api = await openCarterCheck();

    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    expect(await screen.findByRole('img', { name: 'Scores of the right rings' })).toBeInTheDocument();
    expect(api.bombe.findRightRing).toHaveBeenCalledWith(0);
    expect(screen.getByLabelText('Right ring setting')).toHaveTextContent('A (01)');
    expect(screen.getByText(/Not determined yet: rings A, B/)).toBeInTheDocument();
  });

  it('accepts a suggested pair on its own or all of them', async () => {
    const api = await openCarterCheck();
    fireEvent.click(screen.getByRole('button', { name: 'Suggest' }));
    const suggestions = await within(screen.getByRole('region', { name: 'Suggestions' })).findByRole('list');
    expect(within(suggestions).getByText('I/K')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept IK' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'GQ IK' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept IK' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenLastCalledWith(0, { steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW OX' }));
  });

  it('confirms the verdict against the solution', async () => {
    const api = await openCarterCheck();

    fireEvent.click(screen.getByRole('button', { name: 'True stop' }));

    expect(await screen.findByText('The whole crib matches.')).toBeInTheDocument();
    expect(screen.getByText(/This is the true stop/)).toHaveTextContent('This is the true stop, so the verdict is right.');
    expect(api.bombe.confirmCheck).toHaveBeenCalledWith(0, 'True');
    expect(screen.getByRole('button', { name: 'True stop' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('sets up the Enigma with the key after asking, and switches to Enigma mode', async () => {
    const setMode = vi.fn();
    const api = await openCarterCheck(setMode);

    fireEvent.click(screen.getByRole('button', { name: 'Set up Enigma' }));
    expect(api.machine.setUpMachine).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm Enigma setup' })).getByRole('button', { name: 'Set up' }));

    await waitFor(() => expect(setMode).toHaveBeenCalledWith('enigma'));
    expect(api.machine.setUpMachine).toHaveBeenCalledWith({ reflector: 'B', rotors: ['II', 'V', 'III'], rings: [26, 26, 26], plugs: ['GQ'], positions: 'ULA' });
  });
});
