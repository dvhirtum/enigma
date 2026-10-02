import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BombeCheck, BombeResult, BombeState } from '../api';
import { carterBombe, carterChecked, carterChecker, carterMenu, carterPaused, carterRead, emptyBombe, fakeDay, withCrib } from '../test/fakeApi';
import { useMachine } from '../store';
import { renderBombe } from '../test/renderBombe';
import { Hut8Notebook } from './Hut8Notebook';

const finished: BombeState = { ...carterMenu, run: { ...carterPaused, status: 'Finished', pause: null, stops: 2, allStops: 2 }, stops: 2 };

async function currentStep() {
  await screen.findByRole('list', { name: 'Steps' });
  return screen.getAllByRole('listitem').find((item) => item.getAttribute('aria-current') === 'step')!;
}

async function expectCurrent(title: string) {
  await waitFor(async () => expect(within(await currentStep()).getByRole('heading', { level: 3 })).toHaveTextContent(title));
}

const exercise: BombeState = {
  ...finished,
  source: { ...carterBombe.source!, kind: 'Exercise', title: 'Exercise, 19 June 1944', message: fakeDay.messages[0].message },
};

/** Checks Carter's stop and confirms it true. */
async function confirmTrue() {
  fireEvent.click(await screen.findByRole('button', { name: 'Check stop 1' }));
  await expectCurrent('Check the stop');
  fireEvent.click(screen.getByRole('button', { name: 'True stop' }));
}

/** Hands the test the store's receiveBombe, to play what another window did. */
function Receiver({ onReady }: { onReady: (receive: (result: BombeResult) => void) => void }) {
  onReady(useMachine((store) => store.receiveBombe));
  return null;
}

describe('Hut8Notebook', () => {
  it('starts by choosing the message', async () => {
    renderBombe(<Hut8Notebook />, emptyBombe);

    await expectCurrent('Choose the message');
  });

  it('moves on to the crib once a message is loaded, writing the message down', async () => {
    renderBombe(<Hut8Notebook />, carterBombe);

    await expectCurrent('Place the crib');
    expect(screen.getByRole('listitem', { name: 'Choose the message' })).toHaveAttribute('data-done');
    expect(screen.getByRole('group', { name: 'Cipher text' })).toHaveTextContent('SNMK GGST');
  });

  it('draws the menu of the placed crib, then runs the Bombe', async () => {
    renderBombe(<Hut8Notebook />, carterMenu);
    await expectCurrent('Draw the menu');

    fireEvent.click(screen.getByRole('button', { name: 'Send the menu to the Bombe' }));

    await expectCurrent('Run the Bombe');
    expect(screen.getByLabelText('Menu size')).toHaveTextContent('13 links');
  });

  it('lists the stops once a run found some', async () => {
    renderBombe(<Hut8Notebook />, finished);

    await expectCurrent('Choose a stop');
    expect(await screen.findByRole('button', { name: 'Check stop 1' })).toBeInTheDocument();
  });

  it('checks a picked stop', async () => {
    renderBombe(<Hut8Notebook />, finished);

    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 1' }));

    await expectCurrent('Check the stop');
    expect(screen.getByRole('listitem', { name: 'Choose a stop' })).toHaveTextContent('Stop 1: II V III at DKX, G/Q');
  });

  it('reads the message once the stop is confirmed true', async () => {
    const api = renderBombe(<Hut8Notebook />, finished);
    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 1' }));
    await expectCurrent('Check the stop');

    fireEvent.click(screen.getByRole('button', { name: 'True stop' }));

    await expectCurrent('Read the message');
    expect(api.bombe.confirmCheck).toHaveBeenCalledWith(0, 'True');
    expect(screen.getByRole('button', { name: 'Set up Enigma' })).toBeInTheDocument();
  });

  it('ends with reading the message when its indicators cannot be read', async () => {
    renderBombe(<Hut8Notebook />, finished);
    await confirmTrue();

    await expectCurrent('Read the message');
    expect(await screen.findByText(/The key sheet day of this intercept is not known/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Read the indicators' })).not.toBeInTheDocument();
  });

  it('goes on to read the indicators of an exercise', async () => {
    renderBombe(<Hut8Notebook />, exercise, (fake) => fake.bombe.setUpChecker.mockResolvedValue({ ok: true, value: { ...exercise, checker: carterChecker } }));
    await confirmTrue();
    await expectCurrent('Read the message');

    fireEvent.click(screen.getByRole('button', { name: 'Read the indicators' }));

    await expectCurrent('Read the indicators');
    expect(screen.getByRole('button', { name: 'Take the pinch' })).toBeInTheDocument();
  });

  it("goes on to the day's traffic once the rings are read", async () => {
    const pinched: BombeState = { ...exercise, day: fakeDay };
    renderBombe(<Hut8Notebook />, pinched, (fake) => {
      fake.bombe.setUpChecker.mockResolvedValue({ ok: true, value: { ...pinched, checker: carterChecker } });
      fake.bombe.confirmCheck.mockResolvedValue({
        ok: true,
        value: { verdict: 'True', cribMismatches: [], cribUnknown: [], solution: null, check: carterRead },
      });
    });
    await confirmTrue();

    await expectCurrent("Read the day's traffic");
    expect(screen.getByRole('listitem', { name: 'Read the indicators' })).toHaveTextContent('Rings C N Z, Spruchschlüssel ULA');
    expect(screen.getByRole('list', { name: 'Messages of the day' })).toBeInTheDocument();
  });

  it('reads the message again when the same stop of a new message is confirmed true', async () => {
    let receive: (result: BombeResult) => void = () => undefined;
    renderBombe(
      <>
        <Hut8Notebook />
        <Receiver onReady={(value) => (receive = value)} />
      </>,
      exercise,
      (fake) => fake.bombe.setUpChecker.mockResolvedValue({ ok: true, value: { ...exercise, checker: carterChecker } }),
    );
    await confirmTrue();
    await expectCurrent('Read the message');
    fireEvent.click(screen.getByRole('button', { name: 'Read the indicators' }));
    await expectCurrent('Read the indicators');

    act(() => receive({ name: 'generateExercise', args: [], value: { ...exercise, stops: 0 } }));
    await expectCurrent('Run the Bombe');
    act(() => receive({ name: 'clearStops', args: [], value: exercise }));
    act(() => receive({ name: 'getCheck', args: [0], value: { ...carterChecked, verdict: 'True' } }));

    await expectCurrent('Read the message');
  });

  it('stays on the indicators when the square read does not lead to the stop', async () => {
    const pinched: BombeState = { ...exercise, day: fakeDay };
    const wrong: BombeCheck = { ...carterRead, reading: { ...carterRead.reading!, fitsStop: false } };
    renderBombe(<Hut8Notebook />, pinched, (fake) => {
      fake.bombe.setUpChecker.mockResolvedValue({ ok: true, value: { ...pinched, checker: carterChecker } });
      fake.bombe.confirmCheck.mockResolvedValue({
        ok: true,
        value: { verdict: 'True', cribMismatches: [], cribUnknown: [], solution: null, check: wrong },
      });
    });
    await confirmTrue();

    await expectCurrent('Read the indicators');
    expect(screen.queryByRole('list', { name: 'Messages of the day' })).not.toBeInTheDocument();
  });

  it('stays on the indicators when the middle ring read garbles the message', async () => {
    const pinched: BombeState = { ...exercise, day: fakeDay };
    const garbled: BombeCheck = { ...carterRead, reading: { ...carterRead.reading!, middleRingFits: false } };
    renderBombe(<Hut8Notebook />, pinched, (fake) => {
      fake.bombe.setUpChecker.mockResolvedValue({ ok: true, value: { ...pinched, checker: carterChecker } });
      fake.bombe.confirmCheck.mockResolvedValue({
        ok: true,
        value: { verdict: 'True', cribMismatches: [], cribUnknown: [], solution: null, check: garbled },
      });
    });
    await confirmTrue();

    await expectCurrent('Read the indicators');
    expect(screen.queryByRole('list', { name: 'Messages of the day' })).not.toBeInTheDocument();
  });

  it('goes back to the stops after a false verdict', async () => {
    renderBombe(<Hut8Notebook />, finished, (fake) =>
      fake.bombe.confirmCheck.mockResolvedValue({
        ok: true,
        value: { verdict: 'False', cribMismatches: [], cribUnknown: [], solution: null, check: { ...carterChecked, verdict: 'False' } },
      }),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Check stop 1' }));
    await expectCurrent('Check the stop');

    fireEvent.click(screen.getByRole('button', { name: 'False stop' }));

    await expectCurrent('Choose a stop');
  });

  it('reopens a finished step, and keeps it as it is', async () => {
    renderBombe(<Hut8Notebook />, carterMenu);
    await expectCurrent('Draw the menu');

    fireEvent.click(screen.getByRole('button', { name: 'Change: Place the crib' }));

    await expectCurrent('Place the crib');
    expect(screen.getByRole('slider', { name: 'Crib position' })).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Draw the menu' })).not.toHaveAttribute('data-done');

    fireEvent.click(screen.getByRole('button', { name: 'Keep as it is' }));

    await expectCurrent('Draw the menu');
  });

  it('closes a reopened step once it changes', async () => {
    renderBombe(<Hut8Notebook />, carterMenu, (fake) => fake.bombe.setCrib.mockResolvedValue({ ok: true, value: withCrib(carterBombe, 'WETTER') }));
    await expectCurrent('Draw the menu');
    fireEvent.click(screen.getByRole('button', { name: 'Change: Place the crib' }));
    await expectCurrent('Place the crib');

    fireEvent.change(screen.getByRole('textbox', { name: 'Crib' }), { target: { value: 'WETTER' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set crib' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Keep as it is' })).not.toBeInTheDocument());
    await expectCurrent('Place the crib');
  });

  it('closes the reopened message once the same message is loaded again', async () => {
    renderBombe(<Hut8Notebook />, carterMenu);
    await expectCurrent('Draw the menu');
    fireEvent.click(screen.getByRole('button', { name: 'Change: Choose the message' }));
    await expectCurrent('Choose the message');

    fireEvent.click(await screen.findByRole('button', { name: 'Load intercept' }));

    await expectCurrent('Place the crib');
    expect(screen.queryByRole('button', { name: 'Keep as it is' })).not.toBeInTheDocument();
  });
});
