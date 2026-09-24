import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MachineState } from '../api';
import { defaultM3 } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { PlugboardView } from './PlugboardView';

const plugged: MachineState = { ...defaultM3, plugs: ['AT', 'BL'] };

const socket = (letter: string) => screen.findByRole('button', { name: new RegExp(`^Socket ${letter}\\b`) });

function click(element: Element) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(element, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
}

function dragTo(from: Element, to: Element) {
  fireEvent.pointerDown(from, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 60, clientY: 40 });
  fireEvent.pointerUp(to, { button: 0, pointerId: 1, clientX: 120, clientY: 80 });
}

describe('PlugboardView', () => {
  it('shows a socket for each letter in the German keyboard layout', async () => {
    renderMachine(<PlugboardView />);

    await socket('Q');
    const sockets = screen.getAllByRole('button', { name: /^Socket / });
    expect(sockets.map((element) => element.getAttribute('aria-label')!.slice(-1)).join('')).toBe('QWERTZUIOASDFGHJKPYXCVBNML');
  });

  it('shows the plugged cables', async () => {
    renderMachine(<PlugboardView />, plugged);

    expect(await screen.findByRole('button', { name: 'Socket A, plugged to T' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Socket L, plugged to B' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cables')).toHaveTextContent('AT BL · 2 of 13');
  });

  it('connects two sockets clicked in turn', async () => {
    const api = renderMachine(<PlugboardView />);

    click(await socket('A'));
    expect(await socket('A')).toHaveAttribute('aria-pressed', 'true');
    click(await socket('T'));

    expect(api.machine.connectPlug).toHaveBeenCalledWith('AT');
    expect(await socket('A')).toHaveAttribute('aria-pressed', 'false');
  });

  it('connects two sockets picked with the keyboard', async () => {
    const api = renderMachine(<PlugboardView />);

    fireEvent.keyDown(await socket('A'), { key: 'Enter' });
    fireEvent.keyDown(await socket('T'), { key: ' ' });

    expect(api.machine.connectPlug).toHaveBeenCalledWith('AT');
  });

  it('drops the picked socket on Escape or a second click', async () => {
    renderMachine(<PlugboardView />);
    const a = await socket('A');

    fireEvent.keyDown(a, { key: 'Enter' });
    fireEvent.keyDown(a, { key: 'Escape' });
    expect(a).toHaveAttribute('aria-pressed', 'false');

    click(a);
    click(a);
    expect(a).toHaveAttribute('aria-pressed', 'false');
  });

  it('removes the cable of a clicked plugged socket', async () => {
    const api = renderMachine(<PlugboardView />, plugged);

    click(await socket('T'));

    expect(api.machine.disconnectPlug).toHaveBeenCalledWith('T');
    expect(api.machine.connectPlug).not.toHaveBeenCalled();
  });

  it('connects a cable dragged between two sockets', async () => {
    const api = renderMachine(<PlugboardView />);

    dragTo(await socket('A'), await socket('T'));

    expect(api.machine.connectPlug).toHaveBeenCalledWith('AT');
  });

  it('moves a plug dragged to a free socket', async () => {
    const api = renderMachine(<PlugboardView />, plugged);

    dragTo(await socket('A'), await socket('C'));

    await waitFor(() => expect(api.machine.connectPlug).toHaveBeenCalledWith('TC'));
    expect(api.machine.disconnectPlug).toHaveBeenCalledWith('A');
  });

  it('keeps a cable whose plug is dropped on a plugged socket', async () => {
    const api = renderMachine(<PlugboardView />, plugged);

    dragTo(await socket('A'), await socket('B'));

    expect(api.machine.disconnectPlug).not.toHaveBeenCalled();
    expect(api.machine.connectPlug).not.toHaveBeenCalled();
  });

  it('removes a cable whose plug is dropped off the sockets', async () => {
    const api = renderMachine(<PlugboardView />, plugged);

    dragTo(await socket('A'), document.body);

    expect(api.machine.disconnectPlug).toHaveBeenCalledWith('A');
    expect(api.machine.connectPlug).not.toHaveBeenCalled();
  });
});
