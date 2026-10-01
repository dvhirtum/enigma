import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { useMachine } from '../store';
import { carterCheck, carterChecked, carterMenu, carterPaused, emptyChecker } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { CheckStep, CheckSummary, KeyStep } from './CheckStep';

const carter: BombeState = { ...carterMenu, run: { ...carterPaused, status: 'Finished', pause: null, stops: 2, allStops: 2 }, stops: 2 };

/** Opens the check of Carter's true stop and shows it in the step. */
function OpenCheck({ step }: { step: 'check' | 'key' }) {
  const openCheck = useMachine((store) => store.openCheck);
  const check = useMachine((store) => store.check);
  useEffect(() => {
    void openCheck(0);
  }, [openCheck]);
  if (!check) {
    return null;
  }
  return step === 'check' ? <CheckStep check={check} /> : <KeyStep check={check} />;
}

async function openCarterCheck(step: 'check' | 'key' = 'check', state: BombeState = carter, setup?: Parameters<typeof renderBombe>[2]) {
  const api = renderBombe(<OpenCheck step={step} />, state, setup);
  await screen.findByText(step === 'check' ? /Test the stop/ : 'Reflector');
  return api;
}

describe('CheckStep', () => {
  it('sets up the checking machine for the stop', async () => {
    const api = await openCarterCheck();

    await waitFor(() => expect(api.bombe.setUpChecker).toHaveBeenCalledWith(0));
  });

  it('asks before replacing a checking machine set up by hand', async () => {
    const api = await openCarterCheck('check', { ...carter, checker: { ...emptyChecker, drums: ['I', 'II', 'III'] } });

    expect(screen.getByRole('alert')).toHaveTextContent('The checking machine is set up by hand.');
    expect(api.bombe.setUpChecker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Keep it as it is' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up the checking machine for this stop' }));

    await waitFor(() => expect(api.bombe.setUpChecker).toHaveBeenCalledWith(0));
  });

  it('shows the steckers of the stop', async () => {
    await openCarterCheck();

    expect(screen.getByRole('button', { name: 'Partner of G: Q' })).toHaveTextContent('Q');
    expect(screen.getByRole('button', { name: 'Partner of A: unknown' })).toBeDisabled();
  });

  it('leaves the right ring, Suggest and the decrypt to reading the message', async () => {
    await openCarterCheck();

    expect(screen.queryByRole('region', { name: 'Right ring' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Suggest' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Decrypt' })).not.toBeInTheDocument();
  });

  it('writes the partners found between the cipher letters and the crib, under the drum position of each link', async () => {
    await openCarterCheck();

    const links = within(screen.getByRole('region', { name: 'Crib' })).getAllByRole('listitem');
    expect(links).toHaveLength(16);
    expect(links[0]).toHaveAccessibleName('ZZA: S/?, W/?, Unknown');
    expect(links[4]).toHaveAccessibleName('ZZE: G/Q, E/?, Unknown');
    expect(links[4]).toHaveTextContent('ZZEGQE');
    expect(links[14]).toHaveAccessibleName('ZZO: L/?, G/Q, Unknown');
    expect(links[14]).toHaveTextContent('ZZOLQG');
  });

  it('marks contradicted partners in the crib in red', async () => {
    await openCarterCheck('check', carter, (fake) =>
      fake.bombe.getCheck.mockResolvedValue({ ok: true, value: { ...carterCheck, steckers: 'GQ RR RX', contradicted: 'R' } }),
    );

    const link = within(screen.getByRole('region', { name: 'Crib' })).getByRole('listitem', { name: /^ZZF:/ });
    expect(link).toHaveAccessibleName('ZZF: G/Q, R/RX, Unknown');
    expect(within(link).getByText('RX')).toHaveClass('contradicted');
  });

  it('presses the checking machine when a letter is typed, and writes down what its lamp says', async () => {
    const api = await openCarterCheck();
    api.bombe.pressCheckerKey.mockResolvedValue({ ok: true, value: { lamp: 'R', check: { ...carterCheck, steckers: 'GQ RR' } } });
    await waitFor(() => expect(api.bombe.setUpChecker).toHaveBeenCalled());

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(screen.getByRole('button', { name: 'Partner of R: R' })).toBeInTheDocument());
    expect(api.bombe.pressCheckerKey).toHaveBeenCalledWith('Q');
    fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });
    await waitFor(() => expect(api.windows.releaseCheckerKey).toHaveBeenCalled());
  });

  it('marks contradictions in red and rubs out a letter that is clicked', async () => {
    const api = await openCarterCheck('check', carter, (fake) =>
      fake.bombe.getCheck.mockResolvedValue({ ok: true, value: { ...carterCheck, steckers: 'GQ RR RX', contradicted: 'R' } }),
    );

    const box = screen.getByRole('button', { name: 'Partner of R: R X, contradicted' });
    expect(box.parentElement).toHaveClass('contradicted');
    expect(screen.getByRole('button', { name: 'Partner of X: R, contradicted' })).toBeInTheDocument();
    expect(screen.getByText(/The lamps contradict each other at R/)).toBeInTheDocument();

    fireEvent.click(box);

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'GQ' }));
  });

  it('confirms the verdict against the solution', async () => {
    const api = await openCarterCheck();

    fireEvent.click(screen.getByRole('button', { name: 'True stop' }));

    expect(await screen.findByText('The whole crib matches.')).toBeInTheDocument();
    expect(screen.getByText(/This is the true stop/)).toHaveTextContent('This is the true stop, so the verdict is right.');
    expect(api.bombe.confirmCheck).toHaveBeenCalledWith(0, 'True');
  });
});

describe('CheckSummary', () => {  it('lists only the plug pairs, without unsteckered letters', () => {    render(<CheckSummary check={{ ...carterChecked, verdict: 'True' }} />);    expect(screen.getByText(/True stop/)).toHaveTextContent('True stop: steckers AD ET FU GQ HM IK JL NV OX PZ');  });});
describe('KeyStep', () => {
  it('reads the message with the steckers found so far', async () => {
    await openCarterCheck('key');

    expect(screen.getByRole('group', { name: 'Decrypt' })).toHaveTextContent('XGTM BRVO');
    expect(screen.getByRole('textbox', { name: 'Partner of G' })).toHaveValue('Q');
  });

  it('highlights the pairs found while checking, and shows unknown letters faintly as unsteckered', async () => {
    await openCarterCheck('key', carter, (fake) =>
      fake.bombe.getCheck.mockResolvedValue({ ok: true, value: { ...carterCheck, steckers: 'AB GQ', checkedSteckers: 'GQ', verdict: 'True' } }),
    );

    expect(screen.getByRole('textbox', { name: 'Partner of G' })).toHaveAccessibleDescription('found while checking');
    expect(screen.getByRole('textbox', { name: 'Partner of G' }).parentElement).toHaveClass('checked');
    expect(screen.getByRole('textbox', { name: 'Partner of A' }).parentElement).not.toHaveClass('checked');
    const unknown = screen.getByRole('textbox', { name: 'Partner of C' });
    expect(unknown).toHaveValue('');
    expect(unknown).toHaveAttribute('placeholder', 'C');
    expect(unknown).toHaveAccessibleDescription('taken as unsteckered');
  });

  it('writes a partner by hand in place of the old one', async () => {
    const api = await openCarterCheck('key');

    fireEvent.change(screen.getByRole('textbox', { name: 'Partner of G' }), { target: { value: 'QA' } });

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'AG' }));
  });

  it('rubs out a partner when its box is cleared', async () => {
    const api = await openCarterCheck('key');

    fireEvent.change(screen.getByRole('textbox', { name: 'Partner of Q' }), { target: { value: '' } });

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: '' }));
  });

  it('turns the right ring by hand', async () => {
    const api = await openCarterCheck('key');

    fireEvent.click(screen.getByRole('button', { name: 'Next ring' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { rightRing: 1 }));
  });

  it('finds the right ring and says when the rings tie', async () => {
    const api = await openCarterCheck('key');

    fireEvent.click(screen.getByRole('button', { name: 'Find' }));

    expect(await screen.findByRole('img', { name: 'Scores of the right rings' })).toBeInTheDocument();
    expect(api.bombe.findRightRing).toHaveBeenCalledWith(0);
    expect(screen.getByLabelText('Right ring setting')).toHaveTextContent('A (01)');
    expect(screen.getByText(/Not determined yet: rings A, B/)).toBeInTheDocument();
  });

  it('accepts a suggested pair on its own or all of them', async () => {
    const api = await openCarterCheck('key');
    fireEvent.click(screen.getByRole('button', { name: 'Suggest' }));
    const suggestions = await within(screen.getByRole('region', { name: 'Suggestions' })).findByRole('list');
    expect(within(suggestions).getByText('I/K')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Accept IK' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenCalledWith(0, { steckers: 'GQ IK' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Accept IK' })).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Accept all' }));

    await waitFor(() => expect(api.bombe.setCheck).toHaveBeenLastCalledWith(0, { steckers: 'AD ET FU GQ HM IK JL NV OX PZ RR SS WW OX' }));
  });

  it('sets up the Enigma with the key after asking, and shows Enigma mode', async () => {
    const api = await openCarterCheck('key');

    fireEvent.click(screen.getByRole('button', { name: 'Set up Enigma' }));
    expect(api.machine.setUpMachine).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm Enigma setup' })).getByRole('button', { name: 'Set up' }));

    await waitFor(() => expect(api.windows.showMode).toHaveBeenCalledWith('enigma'));
    expect(api.machine.setUpMachine).toHaveBeenCalledWith({ reflector: 'B', rotors: ['II', 'V', 'III'], rings: [26, 26, 26], plugs: ['GQ'], positions: 'ULA' });
  });
});
