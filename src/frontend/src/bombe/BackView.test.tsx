import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { carterMenu, carterPaused, emptyBombe } from '../test/fakeApi';
import { click, dragTo } from '../test/pointer';
import { renderBombe } from '../test/renderBombe';
import { BackView } from './BackView';

const jack = (chain: number, scrambler: number, jack: number) => screen.findByRole('button', { name: new RegExp(`^Chain ${chain} scrambler ${scrambler} jack ${jack}\\b`) });
const common = (chain: number, letter: string) => screen.findByRole('button', { name: `Chain ${chain} common ${letter}` });

describe('BackView', () => {
  it('shows each scrambler cabled to the commons of its letters, and the test register', async () => {
    renderBombe(<BackView />, carterMenu);

    expect(await jack(1, 1, 1)).toHaveAccessibleName('Chain 1 scrambler 1 jack 1, plugged to S');
    expect(await jack(1, 1, 2)).toHaveAccessibleName('Chain 1 scrambler 1 jack 2, plugged to W');
    expect(await jack(2, 1, 2)).toHaveAccessibleName('Chain 2 scrambler 1 jack 2, plugged to E');
    expect(await jack(2, 2, 1)).toHaveAccessibleName('Chain 2 scrambler 2 jack 1');
    expect(screen.getByRole('button', { name: 'Chain 1 test register, plugged to G' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Join chains 1–2' })).toBeChecked();
  });

  it('cables a jack to a common clicked in turn', async () => {
    const api = renderBombe(<BackView />, emptyBombe);

    click(await jack(3, 2, 1));
    click(await common(3, 'K'));

    await waitFor(() => expect(api.bombe.plugJack).toHaveBeenCalledWith(2, 1, 0, 'K'));
  });

  it('cables a jack dragged onto a common', async () => {
    const api = renderBombe(<BackView />, emptyBombe);

    dragTo(await common(1, 'E'), await jack(1, 5, 2));

    await waitFor(() => expect(api.bombe.plugJack).toHaveBeenCalledWith(0, 4, 1, 'E'));
  });

  it('pulls out the cable of a plugged jack that is clicked', async () => {
    const api = renderBombe(<BackView />, carterMenu);

    click(await jack(1, 3, 1));

    await waitFor(() => expect(api.bombe.plugJack).toHaveBeenCalledWith(0, 2, 0, null));
  });

  it('plugs the test register onto a common', async () => {
    const api = renderBombe(<BackView />, emptyBombe);

    click(await screen.findByRole('button', { name: 'Chain 2 test register' }));
    click(await common(2, 'R'));

    await waitFor(() => expect(api.bombe.setTestRegister).toHaveBeenCalledWith(1, { letter: 'R' }));
  });

  it('does not cable a jack to the commons of another chain', async () => {
    const api = renderBombe(<BackView />, emptyBombe);

    click(await jack(1, 1, 1));
    click(await common(2, 'A'));

    expect(await common(2, 'A')).toHaveAttribute('aria-pressed', 'true');
    expect(api.bombe.plugJack).not.toHaveBeenCalled();
  });

  it('joins chains and switches the diagonal board off', async () => {
    const api = renderBombe(<BackView />, emptyBombe);

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Join chains 2–3' }));
    await waitFor(() => expect(api.bombe.joinChains).toHaveBeenCalledWith(1, true));
    fireEvent.click(screen.getByRole('checkbox', { name: 'Diagonal board' }));

    await waitFor(() => expect(api.bombe.configure).toHaveBeenCalledWith({ diagonalBoard: false }));
  });

  it('puts the input on another wire of the test register cable', async () => {
    const api = renderBombe(<BackView />, carterMenu);

    const input = await screen.findByRole('combobox', { name: /Chain 1 input wire/ });
    expect(screen.queryByRole('combobox', { name: /Chain 2 input wire/ })).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Q' } });

    await waitFor(() => expect(api.bombe.setTestRegister).toHaveBeenCalledWith(0, { input: 'Q' }));
  });

  it('locks the switches and jacks while the Bombe runs', async () => {
    renderBombe(<BackView />, { ...carterMenu, run: carterPaused });

    expect(await screen.findByRole('checkbox', { name: 'Diagonal board' })).toBeDisabled();
    expect(await jack(1, 1, 1)).toHaveAttribute('aria-disabled', 'true');
    expect(within(screen.getByRole('group', { name: 'Back of the Bombe' })).getAllByRole('button', { name: /common/ })[0]).toHaveAttribute('aria-disabled', 'true');
  });
});
