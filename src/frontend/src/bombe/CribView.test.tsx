import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { carterBombe, emptyBombe, withCrib } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { cribLetters, CribView } from './CribView';

// WETTER under SNMKGGSTZZUGARLV crashes at positions 5, 6 and 9 (counting from 1).
const carterWetter = withCrib(carterBombe, 'WETTER');

describe('CribView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for a message first', async () => {
    renderBombe(<CribView />, emptyBombe);

    expect(await screen.findByText('Load a message in the Message view first.')).toBeInTheDocument();
  });

  it('asks for a crib when there is none', async () => {
    renderBombe(<CribView />, carterBombe);

    expect(await screen.findByText(/Type the plain text you expect/)).toBeInTheDocument();
  });

  it('sets the crib in capitals, letters only', async () => {
    const api = renderBombe(<CribView />, carterBombe);
    const input = await screen.findByRole('textbox', { name: 'Crib' });

    fireEvent.change(input, { target: { value: 'wetter vor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set crib' }));

    expect(input).toHaveValue('WETTERVOR');
    await waitFor(() => expect(api.bombe.setCrib).toHaveBeenCalledWith('WETTERVOR'));
  });

  it('says when the crib is longer than the cipher text', async () => {
    renderBombe(<CribView />, withCrib(carterBombe, 'WETTERVORHERSAGEXX'));

    expect(await screen.findByText('The crib is longer than the cipher text.')).toBeInTheDocument();
  });

  it('starts at the first position when the crib is not placed', async () => {
    renderBombe(<CribView />, carterWetter);

    const slider = await screen.findByRole('slider', { name: 'Crib position' });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '11');
    expect(screen.getByLabelText('Placed')).toHaveTextContent('Not placed');
  });

  it('slides the crib with the arrow keys and the buttons', async () => {
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Slide left' }));

    expect(slider).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(slider, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '11');
    expect(screen.getByRole('button', { name: 'Slide right' })).toBeDisabled();
    fireEvent.keyDown(slider, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: 'Slide left' })).toBeDisabled();
  });

  it('marks the crashes and will not place a crashed crib', async () => {
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    // GGSTZZ over WETTER: the second T crashes.
    for (let step = 0; step < 4; step++) {
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
    }

    expect(slider).toHaveAttribute('aria-valuetext', 'Position 5, 1 crash');
    expect(document.querySelector('.crib-letters .crash')).toHaveTextContent('T');
    expect(document.querySelectorAll('.crib-cipher .crash')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Place crib' })).toBeDisabled();
  });

  it('places the crib where it has no crashes', async () => {
    const api = renderBombe(<CribView />, carterWetter, (fake) =>
      fake.bombe.placeCrib.mockResolvedValue({ ok: true, value: withCrib(carterBombe, 'WETTER', 1) }),
    );
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(slider, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Position 2, no crashes');
    fireEvent.click(screen.getByRole('button', { name: 'Place crib' }));

    await waitFor(() => expect(api.bombe.placeCrib).toHaveBeenCalledWith(1));
    expect(await screen.findByLabelText('Placed')).toHaveTextContent('Placed at position 2');
    expect(screen.getByRole('button', { name: 'Place crib' })).toBeDisabled();
  });

  it('starts at the placed position', async () => {
    renderBombe(<CribView />, withCrib(carterBombe, 'WETTER', 1));

    expect(await screen.findByRole('slider', { name: 'Crib position' })).toHaveAttribute('aria-valuenow', '2');
  });

  it('slides the crib by dragging it a letter width at a time', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 160 } as DOMRect);
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });
    const crib = document.querySelector('.crib-letters')!;

    fireEvent.pointerDown(crib, { clientX: 100, pointerId: 1 });
    fireEvent.pointerMove(crib, { clientX: 131, pointerId: 1 });
    fireEvent.pointerUp(crib, { pointerId: 1 });
    fireEvent.pointerMove(crib, { clientX: 200, pointerId: 1 });

    // 16 letters in 160 pixels: 31 pixels is 3 letters.
    expect(slider).toHaveAttribute('aria-valuenow', '4');
  });
});

describe('cribLetters', () => {
  it('keeps the letters in capitals', () => {
    expect(cribLetters('Wetter vor-her 1')).toBe('WETTERVORHER');
  });
});
