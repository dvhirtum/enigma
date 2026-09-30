import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { carterBombe, emptyBombe } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { groups } from './letters';
import { MessageStep, MessageSummary } from './MessageStep';

describe('MessageStep', () => {
  it('lists the intercepts with their dates', async () => {
    renderBombe(<MessageStep />);

    expect(await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carter weather crib' })).toBeInTheDocument();
  });

  it('loads the chosen intercept', async () => {
    const api = renderBombe(<MessageStep />);
    await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Intercept' }), { target: { value: 'scharnhorst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load intercept' }));

    await waitFor(() => expect(api.bombe.loadIntercept).toHaveBeenCalledWith('scharnhorst'));
  });

  it('generates a new exercise', async () => {
    const api = renderBombe(<MessageStep />);

    fireEvent.click(await screen.findByRole('button', { name: 'New exercise' }));

    await waitFor(() => expect(api.bombe.generateExercise).toHaveBeenCalledOnce());
  });

  it('loads pasted text', async () => {
    const api = renderBombe(<MessageStep />, emptyBombe);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Radio message or cipher text' }), { target: { value: 'SNMKG GSTZZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }));

    await waitFor(() => expect(api.bombe.pasteCipherText).toHaveBeenCalledWith('SNMKG GSTZZ'));
  });
});

describe('MessageSummary', () => {
  it('writes down the message with its hint and cipher text in groups', async () => {
    renderBombe(<MessageSummary />, carterBombe);

    expect(await screen.findByText('Carter weather crib')).toBeInTheDocument();
    expect(screen.getByText(/Historical intercept · 16 letters/)).toBeInTheDocument();
    expect(screen.getByText('A weather forecast.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cipher text' })).toHaveTextContent('SNMKG GSTZZ UGARL V');
  });
});

describe('groups', () => {
  it('splits text into groups of five', () => {
    expect(groups('ABCDEFGHIJKL')).toBe('ABCDE FGHIJ KL');
    expect(groups('')).toBe('');
  });
});
