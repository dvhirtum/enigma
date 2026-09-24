import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MachineState, RotorState } from '../api';
import { defaultM3 } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { OpenLidView } from './OpenLidView';

const inBox = (rotor: string, ringSetting = 1): RotorState => ({ rotor, ringSetting, position: 'A', slot: null });

const standard: MachineState = {
  ...defaultM3,
  rotorBox: ['IV', 'V', 'VI', 'VII', 'VIII'].map((rotor) => inBox(rotor)),
};

const middleEmpty: MachineState = {
  ...defaultM3,
  rotors: defaultM3.rotors.filter((rotor) => rotor.slot !== 'Middle'),
  rotorBox: [inBox('II'), ...standard.rotorBox],
};

const m4: MachineState = {
  ...defaultM3,
  model: 'M4',
  reflector: 'B-thin',
  rotors: [{ rotor: 'Beta', ringSetting: 1, position: 'A', slot: 'Greek' }, ...defaultM3.rotors],
  rotorBox: [...standard.rotorBox, inBox('Gamma')],
};

const status = () => screen.getByRole('status');

describe('OpenLidView', () => {
  it('shows the rotors in the machine with their ring and position', async () => {
    renderMachine(<OpenLidView />, {
      ...defaultM3,
      rotors: defaultM3.rotors.map((rotor) => (rotor.slot === 'Left' ? { ...rotor, ringSetting: 12, position: 'Q' } : rotor)),
    });

    const left = await screen.findByRole('spinbutton', { name: 'Left slot: rotor I, ring 12 (L)' });
    expect(left).toHaveAttribute('aria-valuetext', 'Q');
    expect(screen.getByRole('img', { name: 'Reflector B' })).toBeInTheDocument();
  });

  it('shows the ring of each rotor in the box and where the others are', async () => {
    renderMachine(<OpenLidView />, { ...defaultM3, rotorBox: [inBox('IV', 5), ...standard.rotorBox.slice(1)] });

    expect(await screen.findByRole('spinbutton', { name: 'Rotor IV in the box, ring' })).toHaveAttribute('aria-valuetext', '05 (E)');
    expect(screen.getByRole('img', { name: 'Rotor II is in the Middle slot' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Reflector B is in the machine' })).toBeInTheDocument();
  });

  it('moves a rotor in the machine to the box when clicked', async () => {
    const api = renderMachine(<OpenLidView />, standard);

    fireEvent.click(await screen.findByRole('spinbutton', { name: /^Left slot/ }));

    expect(api.machine.removeRotor).toHaveBeenCalledWith('Left');
  });

  it('puts a picked rotor into an empty slot', async () => {
    const api = renderMachine(<OpenLidView />, middleEmpty);
    const slot = await screen.findByRole('button', { name: 'Middle slot: empty' });
    expect(slot).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(screen.getByRole('spinbutton', { name: 'Rotor IV in the box, ring' }));
    expect(status()).toHaveTextContent('Rotor IV is picked.');
    expect(slot).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(slot);

    expect(api.machine.insertRotor).toHaveBeenCalledWith('Middle', 'IV');
    expect(status()).not.toHaveTextContent('picked');
  });

  it('swaps a picked rotor with the rotor in the slot', async () => {
    const api = renderMachine(<OpenLidView />, standard);

    fireEvent.click(await screen.findByRole('spinbutton', { name: 'Rotor V in the box, ring' }));
    fireEvent.click(screen.getByRole('spinbutton', { name: /^Right slot/ }));

    expect(api.machine.insertRotor).toHaveBeenCalledWith('Right', 'V');
    expect(api.machine.removeRotor).not.toHaveBeenCalled();
  });

  it('puts Beta and Gamma only into the Greek slot', async () => {
    const api = renderMachine(<OpenLidView />, m4);

    fireEvent.click(await screen.findByRole('spinbutton', { name: 'Rotor Gamma in the box, ring' }));
    fireEvent.click(screen.getByRole('spinbutton', { name: /^Left slot/ }));
    expect(api.machine.insertRotor).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('spinbutton', { name: /^Greek slot/ }));

    expect(api.machine.insertRotor).toHaveBeenCalledWith('Greek', 'Gamma');
  });

  it('drops the pick when the rotor is clicked again or Escape is pressed', async () => {
    renderMachine(<OpenLidView />, standard);
    const rotor = await screen.findByRole('spinbutton', { name: 'Rotor IV in the box, ring' });

    fireEvent.click(rotor);
    fireEvent.click(screen.getByRole('spinbutton', { name: 'Rotor IV in the box, ring, picked' }));
    expect(status()).not.toHaveTextContent('picked');

    fireEvent.click(rotor);
    fireEvent.keyDown(rotor, { key: 'Escape' });
    expect(status()).not.toHaveTextContent('picked');
  });

  it('picks and places with the keyboard', async () => {
    const api = renderMachine(<OpenLidView />, middleEmpty);

    fireEvent.keyDown(await screen.findByRole('spinbutton', { name: 'Rotor II in the box, ring' }), { key: 'Enter' });
    fireEvent.keyDown(screen.getByRole('button', { name: 'Middle slot: empty' }), { key: ' ' });

    expect(api.machine.insertRotor).toHaveBeenCalledWith('Middle', 'II');
  });

  it('turns the ring of a rotor in the box with the mouse wheel and the arrow keys', async () => {
    const api = renderMachine(<OpenLidView />, standard);
    api.machine.setRingSetting.mockResolvedValue({ ok: true, value: standard });
    const rotor = await screen.findByRole('spinbutton', { name: 'Rotor IV in the box, ring' });

    fireEvent.wheel(rotor, { deltaY: -60 });
    await waitFor(() => expect(api.machine.setRingSetting).toHaveBeenCalledWith('IV', 2));
    fireEvent.keyDown(rotor, { key: 'ArrowDown' });

    await waitFor(() => expect(api.machine.setRingSetting).toHaveBeenCalledWith('IV', 26));
  });

  it('turns a rotor in the machine with the arrow keys', async () => {
    const api = renderMachine(<OpenLidView />, standard);

    fireEvent.keyDown(await screen.findByRole('spinbutton', { name: /^Left slot/ }), { key: 'ArrowUp' });

    await waitFor(() => expect(api.machine.turnRotor).toHaveBeenCalledWith('Left', 'B'));
  });

  it('fits a spare reflector from the reflector box', async () => {
    const api = renderMachine(<OpenLidView />, standard);

    fireEvent.click(await screen.findByRole('button', { name: 'Fit reflector C' }));

    expect(api.machine.setReflector).toHaveBeenCalledWith('C');
    expect(screen.queryByRole('button', { name: 'Fit reflector B' })).not.toBeInTheDocument();
  });

  it('offers the thin reflectors on the M4', async () => {
    renderMachine(<OpenLidView />, m4);

    expect(await screen.findByRole('button', { name: 'Fit reflector C-thin' })).toBeInTheDocument();
  });
});
