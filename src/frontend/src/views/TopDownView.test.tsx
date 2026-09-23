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

    const keyboard = await screen.findByRole('group', { name: 'Keyboard' });
    const keys = Array.from(keyboard.querySelectorAll('[role="button"]'), (key) => key.getAttribute('aria-label'));
    expect(keys.join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
    expect(screen.getAllByRole('img', { name: /^Lamp / })).toHaveLength(26);
  });

  it('lights the lamp while a key is held with the mouse', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: true, value: pressedA });
    const key = await screen.findByRole('button', { name: 'A' });

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });

    expect(await screen.findByRole('img', { name: 'Lamp B, lit' })).toBeInTheDocument();
    expect(api.machine.pressKey).toHaveBeenCalledWith('A');
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('spinbutton', { name: 'Right rotor' })).toHaveAttribute('aria-valuetext', 'B');
  });

  it('releases the key when the mouse button goes up', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: true, value: pressedA });
    const key = await screen.findByRole('button', { name: 'A' });

    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    fireEvent.pointerUp(key, { button: 0, pointerId: 1 });

    await waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalledOnce());
  });

  it('presses and releases keys typed on the physical keyboard', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Keyboard' });

    fireEvent.keyDown(window, { key: 'q' });
    fireEvent.keyUp(window, { key: 'q' });

    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalledWith('Q'));
    await waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalledOnce());
  });

  it('holds only one key down at a time', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Keyboard' });

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    fireEvent.keyDown(window, { key: 'b' });
    fireEvent.keyUp(window, { key: 'b' });

    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalled());
    await act(() => Promise.resolve());
    expect(api.machine.pressKey).toHaveBeenCalledOnce();
    expect(api.machine.releaseKey).not.toHaveBeenCalled();
  });

  it('ignores keys typed with a modifier', async () => {
    const api = renderMachine(<TopDownView />);
    await screen.findByRole('group', { name: 'Keyboard' });

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true });
    await act(() => Promise.resolve());

    expect(api.machine.pressKey).not.toHaveBeenCalled();
  });

  it('does not release a key press the backend rejected', async () => {
    const api = renderMachine(<TopDownView />);
    api.machine.pressKey.mockResolvedValue({ ok: false, problem: { status: 400, title: 'No rotors are inserted.' } });
    await screen.findByRole('group', { name: 'Keyboard' });

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyUp(window, { key: 'a' });
    await waitFor(() => expect(api.machine.pressKey).toHaveBeenCalled());
    await act(() => Promise.resolve());

    expect(api.machine.releaseKey).not.toHaveBeenCalled();
  });

  it('turns a rotor with the thumbwheel', async () => {
    const api = renderMachine(<TopDownView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Turn Right rotor up' }));
    fireEvent.click(screen.getByRole('button', { name: 'Turn Left rotor down' }));

    expect(api.machine.turnRotor).toHaveBeenCalledWith('Right', 'B');
    expect(api.machine.turnRotor).toHaveBeenCalledWith('Left', 'Z');
  });

  it('adds up quick turns before the backend answers', async () => {
    const api = renderMachine(<TopDownView />);
    const up = await screen.findByRole('button', { name: 'Turn Middle rotor up' });

    fireEvent.click(up);
    fireEvent.click(up);

    expect(api.machine.turnRotor).toHaveBeenNthCalledWith(1, 'Middle', 'B');
    expect(api.machine.turnRotor).toHaveBeenNthCalledWith(2, 'Middle', 'C');
  });

  it('turns a rotor with the arrow keys and the mouse wheel', async () => {
    const api = renderMachine(<TopDownView />);
    const leftWindow = await screen.findByRole('spinbutton', { name: 'Left rotor' });

    fireEvent.keyDown(leftWindow, { key: 'ArrowDown' });
    fireEvent.wheel(leftWindow, { deltaY: 100 });
    fireEvent.wheel(leftWindow, { deltaY: -100 });

    expect(api.machine.turnRotor.mock.calls).toEqual([
      ['Left', 'Z'],
      ['Left', 'Y'],
      ['Left', 'Z'],
    ]);
  });

  it('shows empty windows when the rotors are out', async () => {
    renderMachine(<TopDownView />, { ...defaultM3, rotors: [], rotorBox: defaultM3.rotors.map((rotor) => ({ ...rotor, slot: null })) });

    expect(await screen.findByText('The rotors are out. Insert them in the open-lid view.')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: 'Left rotor' })).toHaveAttribute('aria-valuetext', 'empty');
  });
});
