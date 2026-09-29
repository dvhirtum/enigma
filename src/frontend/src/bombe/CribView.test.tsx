import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActiveContext } from '../mode';
import { carterBombe, emptyBombe, withCrib } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { cribLetters, CribView } from './CribView';

// WETTER under SNMKGGSTZZUGARLV crashes at positions 5, 6 and 9 (counting from 1).
const carterWetter = withCrib(carterBombe, 'WETTER');

describe('CribView', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
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

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Slide left' }));

    expect(slider).toHaveAttribute('aria-valuenow', '2');
    fireEvent.keyDown(window, { key: 'End' });
    expect(slider).toHaveAttribute('aria-valuenow', '11');
    expect(screen.getByRole('button', { name: 'Slide right' })).toBeDisabled();
    fireEvent.keyDown(window, { key: 'Home' });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(screen.getByRole('button', { name: 'Slide left' })).toBeDisabled();
  });

  it('leaves the arrow keys to the crib field', async () => {
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Crib' }), { key: 'ArrowRight' });

    expect(slider).toHaveAttribute('aria-valuenow', '1');
  });

  it('leaves the arrow keys alone while Enigma mode is shown', async () => {
    renderBombe(
      <ActiveContext.Provider value={false}>
        <CribView />
      </ActiveContext.Provider>,
      carterWetter,
    );
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(slider).toHaveAttribute('aria-valuenow', '1');
  });

  it('marks the crashes and will not place a crashed crib', async () => {
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    // GGSTZZ over WETTER: the second T crashes.
    for (let step = 0; step < 4; step++) {
      fireEvent.keyDown(window, { key: 'ArrowRight' });
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

    fireEvent.keyDown(window, { key: 'ArrowRight' });
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
    // Letters 10 pixels wide, the first at 0.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 10 } as DOMRect);
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });
    const crib = document.querySelector('.crib-letters')!;

    fireEvent.pointerDown(crib, { clientX: 25, pointerId: 1 });
    fireEvent.pointerMove(crib, { clientX: 56, pointerId: 1 });
    fireEvent.pointerUp(crib, { pointerId: 1 });
    fireEvent.pointerMove(crib, { clientX: 100, pointerId: 1 });

    // 31 pixels is 3 letters.
    expect(slider).toHaveAttribute('aria-valuenow', '4');
  });

  it('keeps the crib under the pointer when the strip scrolls during a drag', async () => {
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 10 } as DOMRect);
    renderBombe(<CribView />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });
    const crib = document.querySelector('.crib-letters')!;

    fireEvent.pointerDown(crib, { clientX: 25, pointerId: 1 });
    // The strip scrolls 40 pixels to the left: the pointer, not moved, is now over a letter 4 places on.
    rect.mockReturnValue({ left: -40, width: 10 } as DOMRect);
    fireEvent.pointerMove(crib, { clientX: 25, pointerId: 1 });

    expect(slider).toHaveAttribute('aria-valuenow', '5');
  });

  it('does not scroll the strip while the crib is dragged', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 10 } as DOMRect);
    const scroll = vi.fn();
    HTMLElement.prototype.scrollIntoView = scroll;
    renderBombe(<CribView />, carterWetter);
    await screen.findByRole('slider', { name: 'Crib position' });
    const crib = document.querySelector('.crib-letters')!;
    scroll.mockClear();

    fireEvent.pointerDown(crib, { clientX: 25, pointerId: 1 });
    fireEvent.pointerMove(crib, { clientX: 56, pointerId: 1 });
    expect(scroll).not.toHaveBeenCalled();

    fireEvent.pointerUp(crib, { pointerId: 1 });
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(scroll).toHaveBeenCalled();
  });
});

describe('cribLetters', () => {
  it('keeps the letters in capitals', () => {
    expect(cribLetters('Wetter vor-her 1')).toBe('WETTERVORHER');
  });
});
