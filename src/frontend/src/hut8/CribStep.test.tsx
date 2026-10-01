import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { BombeState } from '../api';
import { carterBombe, withCrib } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { CribStep, CribSummary } from './CribStep';
import { cribLetters } from './letters';

// WETTER under SNMKGGSTZZUGARLV crashes at positions 5, 6 and 9 (counting from 1).
const carterWetter = withCrib(carterBombe, 'WETTER');

describe('CribStep', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
  });

  it('sets the crib in capitals, letters only', async () => {
    const api = renderBombe(<CribStep />, carterBombe);
    const input = await screen.findByRole('textbox', { name: 'Crib' });

    fireEvent.change(input, { target: { value: 'wetter vor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Set crib' }));

    expect(input).toHaveValue('WETTERVOR');
    await waitFor(() => expect(api.bombe.setCrib).toHaveBeenCalledWith('WETTERVOR'));
  });

  it("fills in an intercept's own crib and where it is likely to stand", async () => {
    const api = renderBombe(<CribStep />, carterBombe);

    fireEvent.click(await screen.findByRole('button', { name: 'Suggest crib' }));

    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Crib' })).toHaveValue('WETTERVORHERSAGE'));
    expect(api.bombe.suggestCrib).toHaveBeenCalledWith(undefined);
    expect(screen.getByText(/^Likely place: At or near the start/)).toBeInTheDocument();
    expect(api.bombe.setCrib).not.toHaveBeenCalled();
  });

  it('asks what kind of message pasted text is, then suggests its crib', async () => {
    const pasted: BombeState = { ...carterBombe, source: { ...carterBombe.source!, kind: 'Pasted', hasCrib: false } };
    const api = renderBombe(<CribStep />, pasted);

    fireEvent.click(await screen.findByRole('button', { name: 'Suggest crib' }));
    const question = screen.getByRole('group', { name: 'What kind of message is it?' });
    fireEvent.click(within(question).getByRole('radio', { name: 'Convoy report' }));
    fireEvent.click(within(question).getByRole('button', { name: 'Suggest' }));

    await waitFor(() => expect(api.bombe.suggestCrib).toHaveBeenCalledWith('convoy'));
    expect(screen.queryByRole('group', { name: 'What kind of message is it?' })).not.toBeInTheDocument();
  });

  it('suggests nothing when the kind of pasted message is not known', async () => {
    const pasted: BombeState = { ...carterBombe, source: { ...carterBombe.source!, kind: 'Pasted', hasCrib: false } };
    const api = renderBombe(<CribStep />, pasted);

    fireEvent.click(await screen.findByRole('button', { name: 'Suggest crib' }));
    fireEvent.click(screen.getByRole('radio', { name: "Don't know" }));
    fireEvent.click(screen.getByRole('button', { name: 'Suggest' }));

    expect(await screen.findByText(/Without the kind of message there is no crib to suggest/)).toBeInTheDocument();
    expect(api.bombe.suggestCrib).not.toHaveBeenCalled();
  });

  it('says when the crib is longer than the cipher text', async () => {
    renderBombe(<CribStep />, withCrib(carterBombe, 'WETTERVORHERSAGEXX'));

    expect(await screen.findByText('The crib is longer than the cipher text.')).toBeInTheDocument();
  });

  it('starts at the first position when the crib is not placed', async () => {
    renderBombe(<CribStep />, carterWetter);

    const slider = await screen.findByRole('slider', { name: 'Crib position' });
    expect(slider).toHaveAttribute('aria-valuenow', '1');
    expect(slider).toHaveAttribute('aria-valuemax', '11');
  });

  it('slides the crib with the arrow keys and the buttons', async () => {
    renderBombe(<CribStep />, carterWetter);
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
    renderBombe(<CribStep />, carterWetter);
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Crib' }), { key: 'ArrowRight' });

    expect(slider).toHaveAttribute('aria-valuenow', '1');
  });

  it('crosses out the crashes and will not place a crashed crib', async () => {
    renderBombe(<CribStep />, carterWetter);
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
    const api = renderBombe(<CribStep />, carterWetter, (fake) =>
      fake.bombe.placeCrib.mockResolvedValue({ ok: true, value: withCrib(carterBombe, 'WETTER', 1) }),
    );
    const slider = await screen.findByRole('slider', { name: 'Crib position' });

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(slider).toHaveAttribute('aria-valuetext', 'Position 2, no crashes');
    fireEvent.click(screen.getByRole('button', { name: 'Place crib' }));

    await waitFor(() => expect(api.bombe.placeCrib).toHaveBeenCalledWith(1));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Place crib' })).toBeDisabled());
  });

  it('starts at the placed position', async () => {
    renderBombe(<CribStep />, withCrib(carterBombe, 'WETTER', 1));

    expect(await screen.findByRole('slider', { name: 'Crib position' })).toHaveAttribute('aria-valuenow', '2');
  });

  it('slides the crib by dragging it a letter width at a time', async () => {
    // Letters 10 pixels wide, the first at 0.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, width: 10 } as DOMRect);
    renderBombe(<CribStep />, carterWetter);
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
    renderBombe(<CribStep />, carterWetter);
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
    renderBombe(<CribStep />, carterWetter);
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

describe('CribSummary', () => {
  it('writes the crib under the cipher letters it covers', async () => {
    renderBombe(<CribSummary />, withCrib(carterBombe, 'WETTER', 1));

    expect(await screen.findByText('Placed at position 2, no crashes.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Crib under the cipher text' })).toHaveTextContent('NMKGGSWETTER');
  });
});

describe('cribLetters', () => {
  it('keeps the letters in capitals', () => {
    expect(cribLetters('Wetter vor-her 1')).toBe('WETTERVORHER');
  });
});
