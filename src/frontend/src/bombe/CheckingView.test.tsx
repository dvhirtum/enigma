import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import type { BombeState } from '../api';
import { useMachine } from '../store';
import { carterMenu, carterPaused } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { CheckingView } from './CheckingView';

const carter: BombeState = { ...carterMenu, run: { ...carterPaused, status: 'Finished', pause: null, stops: 2, allStops: 2 }, stops: 2 };

function OpenCheck() {
  const openCheck = useMachine((store) => store.openCheck);
  useEffect(() => {
    void openCheck(0);
  }, [openCheck]);
  return null;
}

/** Renders the Checking view with the check of Carter's true stop open. */
async function openCarterCheck() {
  const api = renderBombe(
    <>
      <OpenCheck />
      <CheckingView />
    </>,
    carter,
  );
  await screen.findByRole('group', { name: 'Checking machine' });
  return api;
}

describe('CheckingView', () => {
  it('asks for a stop when none is picked', async () => {
    renderBombe(<CheckingView />, carter);

    expect(await screen.findByText('No stop picked. Choose one in the Hut 8 notebook.')).toBeInTheDocument();
  });

  it('sets the checking machine to the stop', async () => {
    await openCarterCheck();

    expect(screen.getByText(/Stop 1: II V III, indicator/)).toHaveTextContent('Stop 1: II V III, indicator DKX, G/Q.');
    expect(screen.getByRole('img', { name: 'left drum II at Z, ring D' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'right drum III at Z, ring X' })).toBeInTheDocument();
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
});
