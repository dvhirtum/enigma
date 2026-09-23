import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MachineState } from '../api';
import { defaultM3 } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { TopDownView } from './TopDownView';

const m4: MachineState = {
  ...defaultM3,
  model: 'M4',
  reflector: 'B-thin',
  rotors: [{ rotor: 'Beta', ringSetting: 1, position: 'A', slot: 'Greek' }, ...defaultM3.rotors],
};

const pressedA: MachineState = {
  ...defaultM3,
  rotors: defaultM3.rotors.map((rotor) => (rotor.slot === 'Right' ? { ...rotor, position: 'B' } : rotor)),
  heldKey: 'A',
  litLamp: 'B',
};

/** Makes the fake backend keep the positions it is turned to. */
function turnRotors(api: ReturnType<typeof renderMachine>) {
  let state = defaultM3;
  api.machine.turnRotor.mockImplementation((slot: string, position: string) => {
    state = { ...state, rotors: state.rotors.map((rotor) => (rotor.slot === slot ? { ...rotor, position } : rotor)) };
    return Promise.resolve({ ok: true, value: state });
  });
}

describe('TopDownView', () => {
  it('shows a window for each rotor', async () => {
    renderMachine(<TopDownView />);

    const windows = await screen.findAllByRole('spinbutton');
    expect(windows.map((window) => window.getAttribute('aria-label'))).toEqual(['Left rotor', 'Middle rotor', 'Right rotor']);
    expect(screen.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'A');
  });

  it('shows four windows on the M4', async () => {
    renderMachine(<TopDownView />, m4);

    expect(await screen.findByRole('spinbutton', { name: 'Greek rotor' })).toBeInTheDocument();
    expect(screen.getAllByRole('spinbutton')).toHaveLength(4);
  });

  it('shows the lamps and keys in the German keyboard layout', async () => {
    renderMachine(<TopDownView />);

    const lamps = await screen.findAllByRole('img', { name: /^Lamp / });
    expect(lamps.map((lamp) => lamp.getAttribute('aria-label')!.slice(-1)).join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
    const keys = screen.getAllByTestId(/^key-/);
    expect(keys.map((key) => key.textContent).join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
  });

  it('hides the keys and thumbwheels from assistive technology', async () => {
    renderMachine(<TopDownView />);

    await screen.findByRole('group', { name: 'Lampboard' });

    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('lights the lamp while a key is held with the mouse', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: true, value: pressedA });
    const key = await screen.findByTestId('key-A');

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });

    expect(await screen.findByRole('img', { name: 'Lamp B, lit' })).toBeInTheDocument();
    expect(api.machine.pressKey).toHaveBeenCalledWith('A');
    expect(screen.getByTestId('key-A')).toHaveClass('down');
    expect(screen.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'B');
  });

  it('releases the key when the mouse button goes up', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: true, value: pressedA });
    const key = await screen.findByTestId('key-A');

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(key, { button: 0, pointerId: 1 });

    await waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalledOnce());
  });

  it('presses and releases keys typed on the physical keyboard', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Lampboard' });

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });
    fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });

    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalledWith('Q'));
    await waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalledOnce());
  });

  it('releases a physical key that types another character when it goes up', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Lampboard' });

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });
    fireEvent.keyUp(window, { key: '@', code: 'KeyQ' });

    await waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalledOnce());
  });

  it('holds only one key down at a time', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Lampboard' });

    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' });
    fireEvent.keyDown(window, { key: 'a', code: 'KeyA', repeat: true });
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' });
    fireEvent.keyUp(window, { key: 'b', code: 'KeyB' });

    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalled());
    await act(() => Promise.resolve());
    expect(api.machine.pressKey).toHaveBeenCalledOnce();
    expect(api.machine.releaseKey).not.toHaveBeenCalled();
  });

  it('ignores keys typed with a modifier', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Lampboard' });

    fireEvent.keyDown(window, { key: 'c', code: 'KeyC', ctrlKey: true });
    await act(() => Promise.resolve());

    expect(api.machine.pressKey).not.toHaveBeenCalled();
  });

  it('does not release a key press the backend rejected', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: false, problem: { status: 400, title: 'No rotors are inserted.' } });
    await screen.findByRole('group', { name: 'Lampboard' });

    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' });
    fireEvent.keyUp(window, { key: 'a', code: 'KeyA' });
    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalled());
    await act(() => Promise.resolve());

    expect(api.machine.releaseKey).not.toHaveBeenCalled();
  });

  it('turns a rotor with the thumbwheel', async () => {
    const api = renderMachine(<TopDownView />);

    fireEvent.click(await screen.findByTestId('thumbwheel-Right-up'));
    fireEvent.click(screen.getByTestId('thumbwheel-Left-down'));

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledWith('Left', 'Z'));
    expect(api.machine.turnRotor).toHaveBeenCalledWith('Right', 'B');
  });

  it('adds up quick turns before the backend answers', async () => {
    const api = renderMachine(<TopDownView />);
    turnRotors(api);
    const up = await screen.findByTestId('thumbwheel-Middle-up');

    fireEvent.click(up);
    fireEvent.click(up);

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledTimes(2));
    expect(api.machine.turnRotor).toHaveBeenNthCalledWith(1, 'Middle', 'B');
    expect(api.machine.turnRotor).toHaveBeenNthCalledWith(2, 'Middle', 'C');
  });

  it('turns a rotor after the key released before it', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: true, value: pressedA });
    api.machine.releaseKey.mockResolvedValue({ ok: true, value: { ...pressedA, heldKey: null, litLamp: null } });
    const key = await screen.findByTestId('key-A');

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(key, { button: 0, pointerId: 1 });
    fireEvent.click(screen.getByTestId('thumbwheel-Right-up'));

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledWith('Right', 'C'));
    expect(api.machine.releaseKey.mock.invocationCallOrder[0]).toBeLessThan(api.machine.turnRotor.mock.invocationCallOrder[0]);
  });

  it('turns a rotor with the arrow keys and the mouse wheel', async () => {
    const api = renderMachine(<TopDownView />);
    turnRotors(api);
    const leftWindow = await screen.findByRole('spinbutton', { name: 'Left rotor' });

    fireEvent.keyDown(leftWindow, { key: 'ArrowDown' });
    fireEvent.wheel(leftWindow, { deltaY: 100 });
    fireEvent.wheel(leftWindow, { deltaY: -100 });

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledTimes(3));
    expect(api.machine.turnRotor.mock.calls).toEqual([
      ['Left', 'Z'],
      ['Left', 'Y'],
      ['Left', 'Z'],
    ]);
  });

  it('adds up small wheel movements to one step', async () => {
    const api = renderMachine(<TopDownView />);
    const leftWindow = await screen.findByRole('spinbutton', { name: 'Left rotor' });

    for (let event = 0; event < 9; event++) {
      fireEvent.wheel(leftWindow, { deltaY: -10 });
    }

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledOnce());
    expect(api.machine.turnRotor).toHaveBeenCalledWith('Left', 'B');
  });

  it('shows empty windows when the rotors are out', async () => {
    renderMachine(<TopDownView />, { ...defaultM3, rotors: [], rotorBox: defaultM3.rotors.map((rotor) => ({ ...rotor, slot: null })) });

    expect(await screen.findByText('The rotors are out. Insert them in the open-lid view.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Left rotor' })).toHaveAttribute('aria-valuetext', 'empty');
  });
});
