import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { carterBombe, emptyBombe } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { groups } from './letters';
import { MessageStep, MessageSummary } from './MessageStep';

describe('MessageStep', () => {
  it('lists the intercepts with their dates', async () => {
    renderBombe(<MessageStep onDone={vi.fn()} />);

    expect(await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Carter weather crib' })).toBeInTheDocument();
  });

  it('loads the chosen intercept', async () => {
    const onDone = vi.fn();
    const api = renderBombe(<MessageStep onDone={onDone} />);
    await screen.findByRole('option', { name: 'Scharnhorst (1943-12-26)' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Intercept' }), { target: { value: 'scharnhorst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load intercept' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(api.bombe.loadIntercept).toHaveBeenCalledWith('scharnhorst');
  });

  it('generates a new exercise', async () => {
    const onDone = vi.fn();
    const api = renderBombe(<MessageStep onDone={onDone} />);

    fireEvent.click(await screen.findByRole('button', { name: 'New exercise' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(api.bombe.generateExercise).toHaveBeenCalledOnce();
  });

  it('loads pasted text', async () => {
    const onDone = vi.fn();
    const api = renderBombe(<MessageStep onDone={onDone} />, emptyBombe);

    fireEvent.change(await screen.findByRole('textbox', { name: 'Radio message or cipher text' }), { target: { value: 'SNMKG GSTZZ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load pasted text' }));

    await waitFor(() => expect(onDone).toHaveBeenCalledOnce());
    expect(api.bombe.pasteCipherText).toHaveBeenCalledWith('SNMKG GSTZZ');
  });

  it('stays open when the message is rejected', async () => {
    const onDone = vi.fn();
    const api = renderBombe(<MessageStep onDone={onDone} />, emptyBombe, (fake) =>
      fake.bombe.generateExercise.mockResolvedValue({ ok: false, problem: { status: 400, title: 'No M3 key sheets.' } }),
    );

    fireEvent.click(await screen.findByRole('button', { name: 'New exercise' }));

    await waitFor(() => expect(api.bombe.generateExercise).toHaveBeenCalledOnce());
    expect(onDone).not.toHaveBeenCalled();
  });
});
describe('MessageSummary', () => {
  it('writes down the message with its hint and cipher text in groups', async () => {
    renderBombe(<MessageSummary />, carterBombe);

    expect(await screen.findByText('Carter weather crib')).toBeInTheDocument();
    expect(screen.getByText(/Historical intercept · 16 letters/)).toBeInTheDocument();
    expect(screen.getByText('A weather forecast.')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Cipher text' })).toHaveTextContent('SNMK GGST ZZUG ARLV');
  });
});

describe('groups', () => {
  it('splits text into groups of four', () => {
    expect(groups('ABCDEFGHIJKL')).toBe('ABCD EFGH IJKL');
    expect(groups('')).toBe('');
  });
});
