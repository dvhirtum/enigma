import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { carterBombe, carterMenu, carterPaused } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { BackView } from './BackView';

describe('BackView', () => {
  it('cables each scrambler of the copy to the commons of its letters', async () => {
    renderBombe(<BackView />, carterMenu);

    expect(await screen.findAllByRole('img', { name: /^Copy 1 scrambler \d+ jacks/ })).toHaveLength(13);
    expect(screen.getByRole('img', { name: 'Copy 1 scrambler 1 jacks S and W' })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /^Common/ })).toHaveLength(12);
    expect(screen.getByRole('img', { name: 'Test register on G, input A' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Diagonal board on' })).toBeInTheDocument();
  });

  it('switches the diagonal board off', async () => {
    const api = renderBombe(<BackView />, carterMenu);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Diagonal board' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ diagonalBoard: false }));
  });

  it('shows the diagonal board switched off', async () => {
    renderBombe(<BackView />, { ...carterMenu, settings: { ...carterMenu.settings, diagonalBoard: false } });

    expect(await screen.findByRole('img', { name: 'Diagonal board off' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Diagonal board' })).not.toBeChecked();
  });

  it('puts the input on another wire of the test register cable', async () => {
    const api = renderBombe(<BackView />, carterMenu);

    fireEvent.change(await screen.findByRole('combobox', { name: /Input on wire/ }), { target: { value: 'K' } });

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ input: 'K' }));
  });

  it('locks the switches while the Bombe runs', async () => {
    renderBombe(<BackView />, { ...carterMenu, run: carterPaused });

    expect(await screen.findByRole('checkbox', { name: 'Diagonal board' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: /Input on wire/ })).toBeDisabled();
  });

  it('asks for a menu before plugging up', async () => {
    renderBombe(<BackView />, carterBombe);

    expect(await screen.findByText('Draw a menu in the Hut 8 notebook to plug up the Bombe.')).toBeInTheDocument();
  });
});
