import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { MachineState, RotorState } from '../api';
import { defaultM3 } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { OpenLidView } from './OpenLidView';

const optionValues = (select: HTMLElement) => Array.from(select.querySelectorAll('option'), (option) => option.value);

const inBox = (rotor: string, ringSetting = 1): RotorState => ({ rotor, ringSetting, position: 'A', slot: null });

const withBox: MachineState = {
  ...defaultM3,
  rotorBox: ['IV', 'V', 'VI', 'VII', 'VIII'].map((rotor) => inBox(rotor)),
};

const rotorsOut: MachineState = {
  ...defaultM3,
  rotors: [],
  rotorBox: ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map((rotor) => inBox(rotor)),
};

const m4RotorsOut: MachineState = {
  ...rotorsOut,
  model: 'M4',
  reflector: 'B-thin',
  rotorBox: [...rotorsOut.rotorBox, inBox('Beta'), inBox('Gamma')],
};

describe('OpenLidView', () => {
  it('shows the reflector and the inserted rotors with their rings', async () => {
    renderMachine(<OpenLidView />, {
      ...withBox,
      rotors: defaultM3.rotors.map((rotor) => (rotor.slot === 'Left' ? { ...rotor, ringSetting: 12 } : rotor)),
    });

    expect(await screen.findByRole('img', { name: 'Left slot: rotor I, ring 12 L, position A' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Reflector' })).toHaveValue('B');
  });

  it('offers the reflectors of the model', async () => {
    renderMachine(<OpenLidView />, { ...m4RotorsOut });

    const reflector = await screen.findByRole('combobox', { name: 'Reflector' });
    expect(optionValues(reflector)).toEqual(['B-thin', 'C-thin']);
  });

  it('sets the reflector', async () => {
    const api = renderMachine(<OpenLidView />);

    fireEvent.change(await screen.findByRole('combobox', { name: 'Reflector' }), { target: { value: 'C' } });

    expect(api.machine.setReflector).toHaveBeenCalledWith('C');
  });

  it('removes the rotors', async () => {
    const api = renderMachine(<OpenLidView />);

    fireEvent.click(await screen.findByRole('button', { name: 'Remove rotors' }));

    expect(api.machine.removeRotors).toHaveBeenCalledOnce();
  });

  it('sets the ring of a rotor in the box', async () => {
    const api = renderMachine(<OpenLidView />, withBox);

    fireEvent.change(await screen.findByRole('combobox', { name: 'Ring setting of rotor IV' }), { target: { value: '5' } });

    expect(api.machine.setRingSetting).toHaveBeenCalledWith('IV', 5);
  });

  it('inserts the rotors picked for each slot', async () => {
    const api = renderMachine(<OpenLidView />, rotorsOut);
    const insert = await screen.findByRole('button', { name: 'Insert rotors' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Left slot' }), { target: { value: 'V' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Middle slot' }), { target: { value: 'I' } });
    expect(insert).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Right slot' }), { target: { value: 'VIII' } });
    fireEvent.click(insert);

    expect(api.machine.insertRotors).toHaveBeenCalledWith(['V', 'I', 'VIII']);
  });

  it('clears the other slot when its rotor is picked again', async () => {
    renderMachine(<OpenLidView />, rotorsOut);
    const left = await screen.findByRole('combobox', { name: 'Left slot' });
    const middle = screen.getByRole('combobox', { name: 'Middle slot' });

    fireEvent.change(middle, { target: { value: 'V' } });
    fireEvent.change(left, { target: { value: 'V' } });

    expect(left).toHaveValue('V');
    expect(middle).toHaveValue('');
  });

  it('offers only Beta and Gamma for the Greek slot', async () => {
    renderMachine(<OpenLidView />, m4RotorsOut);

    const greek = await screen.findByRole('combobox', { name: 'Greek slot' });
    const left = screen.getByRole('combobox', { name: 'Left slot' });
    expect(optionValues(greek)).toEqual(['', 'Beta', 'Gamma']);
    expect(optionValues(left)).not.toContain('Beta');
  });

  it('keeps the last rotor order after the rotors are removed', async () => {
    const api = renderMachine(<OpenLidView />);
    api.machine.removeRotors.mockResolvedValue({ ok: true, value: rotorsOut });

    fireEvent.click(await screen.findByRole('button', { name: 'Remove rotors' }));

    expect(await screen.findByRole('combobox', { name: 'Left slot' })).toHaveValue('I');
    expect(screen.getByRole('combobox', { name: 'Right slot' })).toHaveValue('III');
    expect(screen.getByRole('button', { name: 'Insert rotors' })).toBeEnabled();
  });
});
