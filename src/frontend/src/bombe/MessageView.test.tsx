import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { carterBombe, emptyBombe } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { groups, MessageView } from './MessageView';

describe('MessageView', () => {
  it('says when no message is loaded', async () => {
    renderBombe(<MessageView />);

    expect(await screen.findByText(/No message loaded/)).toBeInTheDocument();
  });

  it('lists the intercepts with their dates', async () => {
    renderBombe(<MessageView />);

    expect(await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carter weather crib' })).toBeInTheDocument();
  });

  it('loads the chosen intercept', async () => {
    const api = renderBombe(<MessageView />);
    await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Intercept' }), { target: { value: 'scharnhorst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load intercept' }));

    await waitFor(() => expect(api.bombe.loadIntercept).toHaveBeenCalledWith('scharnhorst'));
  });

  it('shows the loaded message with its hint, transcript and cipher text in groups', async () => {
    renderBombe(<MessageView />, carterBombe);

    expect(await screen.findByRole('heading', { name: 'Carter weather crib' })).toBeInTheDocument();
    expect(screen.getByText('Historical intercept')).toBeInTheDocument();
    expect(screen.getByText('A weather forecast.')).toBeInTheDocument();
    expect(screen.getByLabelText('Transcript')).toHaveTextContent('SNMKG GSTZZ UGARL V');
    expect(screen.getByRole('heading', { name: 'Cipher text (16 letters)' })).toBeInTheDocument();
    expect(screen.getByLabelText('Cipher text')).toHaveTextContent('SNMKG GSTZZ UGARL V');
  });

  it('generates a new exercise', async () => {
    const api = renderBombe(<MessageView />);

    fireEvent.click(await screen.findByRole('button', { name: 'New exercise' }));

    await waitFor(() => expect(api.bombe.generateExercise).toHaveBeenCalledOnce());
  });

  it('loads pasted text', async () => {
    const api = renderBombe(<MessageView />, emptyBombe, (fake) =>
      fake.bombe.pasteCipherText.mockResolvedValue({ ok: true, value: { ...carterBombe, source: { ...carterBombe.source!, kind: 'Pasted', title: 'Pasted cipher text' } } }),
    );

    fireEvent.change(await screen.findByRole('textbox', { name: 'Radio message or cipher text' }), { target: { value: 'SNMKG GSTZZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }));

    await waitFor(() => expect(api.bombe.pasteCipherText).toHaveBeenCalledWith('SNMKG GSTZZ'));
    expect(await screen.findByRole('heading', { name: 'Pasted cipher text' })).toBeInTheDocument();
  });
});

describe('groups', () => {
  it('splits text into groups of five', () => {
    expect(groups('ABCDEFGHIJKL')).toBe('ABCDE FGHIJ KL');
    expect(groups('')).toBe('');
  });
});
