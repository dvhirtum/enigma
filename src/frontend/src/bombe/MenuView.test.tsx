import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { carterBombe, carterMenu } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { drumLetters, formatStops, MenuView } from './MenuView';

const carterLinks = carterMenu.menu!.links;

describe('MenuView', () => {
  it('asks for the crib to be placed first', async () => {
    renderBombe(<MenuView />, carterBombe);

    expect(await screen.findByText('Place the crib in the Crib view first.')).toBeInTheDocument();
  });

  it('sums up the part connected to the test register', async () => {
    renderBombe(<MenuView />, carterMenu);

    expect(await screen.findByLabelText('Menu size')).toHaveTextContent('13 links, 12 letters, 2 loops · test register on G');
    expect(screen.getByText(/With the diagonal board/)).toHaveTextContent('With the diagonal board: 0.4 (on)');
    expect(screen.getByText(/Without/)).toHaveTextContent('Without: 721');
  });

  it('lists every crib link, the plugged ones checked', async () => {
    renderBombe(<MenuView />, carterMenu);
    const list = await screen.findByRole('group', { name: 'Links' });

    const boxes = within(list).getAllByRole('checkbox');
    expect(boxes).toHaveLength(16);
    expect(boxes.filter((box) => (box as HTMLInputElement).checked)).toHaveLength(13);
    expect(within(list).getByRole('checkbox', { name: 'Link M–T at 3 (ZZC)' })).not.toBeChecked();
  });

  it('plugs a link in, keeping the test register', async () => {
    const api = renderBombe(<MenuView />, carterMenu);

    fireEvent.click(await screen.findByRole('checkbox', { name: /T–O at 8/ }));

    const expected = carterMenu.menu!.cribLinks.filter((link) => carterLinks.includes(link) || link === 'TO8');
    await waitFor(() => expect(api.bombe.setMenu).toHaveBeenCalledWith(expected, 'G'));
  });

  it('lets the backend choose the test register when its letter leaves the menu', async () => {
    const menu = { ...carterMenu.menu!, links: ['SW1', 'NE2'], connectedLinks: ['SW1'], testRegister: 'S' };
    const api = renderBombe(<MenuView />, { ...carterMenu, menu });

    fireEvent.click(await screen.findByRole('checkbox', { name: /S–W at 1/ }));

    await waitFor(() => expect(api.bombe.setMenu).toHaveBeenCalledWith(['NE2'], undefined));
  });

  it('keeps the last link plugged', async () => {
    const menu = { ...carterMenu.menu!, links: ['SW1'], connectedLinks: ['SW1'], testRegister: 'S' };
    renderBombe(<MenuView />, { ...carterMenu, menu });

    expect(await screen.findByRole('checkbox', { name: /S–W at 1/ })).toBeDisabled();
  });

  it('warns about links that are not connected to the test register', async () => {
    const menu = { ...carterMenu.menu!, links: [...carterLinks, 'MT3'] };
    renderBombe(<MenuView />, { ...carterMenu, menu });

    expect(await screen.findByRole('status')).toHaveTextContent('1 link is not connected to the test register letter G and tests nothing: MT3.');
  });

  it('puts the test register on a clicked letter', async () => {
    const api = renderBombe(<MenuView />, carterMenu);
    const graph = await screen.findByRole('group', { name: 'Menu graph' });

    const letter = within(graph).getByRole('button', { name: 'Letter E' });
    fireEvent.pointerDown(letter);
    fireEvent.pointerUp(letter);

    await waitFor(() => expect(api.bombe.setMenu).toHaveBeenCalledWith(carterLinks, 'E'));
    expect(within(graph).getByRole('button', { name: 'Letter G' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('does not put the test register on a letter off the menu', async () => {
    const api = renderBombe(<MenuView />, carterMenu);
    const letter = await screen.findByRole('button', { name: 'Letter T' });

    fireEvent.pointerDown(letter);
    fireEvent.pointerUp(letter);

    expect(letter).toHaveAttribute('aria-disabled', 'true');
    expect(api.bombe.setMenu).not.toHaveBeenCalled();
  });

  it('builds the menu again', async () => {
    const api = renderBombe(<MenuView />, carterMenu);

    fireEvent.click(await screen.findByRole('button', { name: 'Build menu' }));

    await waitFor(() => expect(api.bombe.buildMenu).toHaveBeenCalled());
  });

  it('writes offsets as drum letters from ZZZ', () => {
    expect([1, 3, 26, 27].map(drumLetters)).toEqual(['ZZA', 'ZZC', 'ZAZ', 'ZAA']);
  });

  it('writes small estimates with one decimal', () => {
    expect([0.04, 9.96, 721.3, 17_575.6].map(formatStops)).toEqual(['0.0', '10', '721', '17,576']);
  });
});
