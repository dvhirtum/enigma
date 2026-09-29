import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { createFakeApi, defaultM3 } from './test/fakeApi';

describe('App', () => {
  it('shows a starting screen while the backend starts', async () => {
    const { api } = createFakeApi({ state: 'starting' });

    render(<App api={api} />);

    expect(await screen.findByRole('status')).toHaveTextContent('Starting the machine...');
  });

  it('shows the machine frame once the backend runs', async () => {
    const { api } = createFakeApi();

    render(<App api={api} />);

    expect(await screen.findByRole('tablist', { name: 'Views' })).toBeInTheDocument();
    expect(await screen.findByRole('contentinfo')).toHaveTextContent('Backend v1.2.3');
  });

  it('starts in Enigma mode', async () => {
    const { api } = createFakeApi();

    render(<App api={api} />);

    expect(await screen.findByRole('button', { name: 'Enigma', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bombe', pressed: false })).toBeInTheDocument();
    expect(document.title).toBe('Enigma');
  });

  it('switches to the Bombe and back, keeping the Enigma view', async () => {
    const { api } = createFakeApi();
    render(<App api={api} />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Plugboard' }));

    fireEvent.click(screen.getByRole('button', { name: 'Bombe' }));

    expect(screen.getByRole('main', { name: 'Bombe' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Views' })).not.toBeInTheDocument();
    expect(document.title).toBe('Bombe');

    fireEvent.click(screen.getByRole('button', { name: 'Enigma' }));

    expect(screen.getByRole('tab', { name: 'Plugboard' })).toHaveAttribute('aria-selected', 'true');
    expect(document.title).toBe('Enigma');
  });

  it('leaves the Enigma keys alone in Bombe mode', async () => {
    const { api } = createFakeApi();
    render(<App api={api} />);
    await screen.findByRole('tablist', { name: 'Views' });
    fireEvent.click(screen.getByRole('button', { name: 'Bombe' }));

    fireEvent.keyDown(window, { key: 'q', code: 'KeyQ' });
    fireEvent.keyUp(window, { key: 'q', code: 'KeyQ' });
    await act(() => Promise.resolve());

    expect(api.machine.pressKey).not.toHaveBeenCalled();
  });

  it('opens the instructions from Bombe mode', async () => {
    const { api } = createFakeApi();
    render(<App api={api} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Bombe' }));

    fireEvent.click(screen.getByRole('button', { name: 'Instructions' }));

    expect(api.windows.openInstructions).toHaveBeenCalledOnce();
  });

  it('keeps the mode while a key is held down', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, heldKey: 'Q' } });

    render(<App api={api} />);

    await waitFor(() => expect(screen.getByRole('button', { name: 'Bombe' })).toBeDisabled());
  });

  it("shows the operator's notebook in the notebook window", async () => {
    const { api } = createFakeApi();

    render(<App api={api} page="notebook" />);

    expect(await screen.findByRole('tablist', { name: 'Notebook' })).toBeInTheDocument();
    expect(screen.queryByRole('tablist', { name: 'Views' })).not.toBeInTheDocument();
  });

  it('shows the user guide in the instructions window', () => {
    const { api } = createFakeApi();

    render(<App api={api} page="instructions" />);

    expect(screen.getByRole('article', { name: 'Instructions' })).toHaveTextContent('Enigma user guide');
    expect(screen.queryByRole('tablist', { name: 'Views' })).not.toBeInTheDocument();
  });

  it('follows the machine state changed in another window', async () => {
    const { api, pushState } = createFakeApi();
    render(<App api={api} />);
    await screen.findByText('M3 · UKW B · I II III');

    act(() => pushState({ ...defaultM3, reflector: 'C' }));

    expect(screen.getByLabelText('Machine')).toHaveTextContent('M3 · UKW C · I II III');
  });

  it('shows the error screen when the backend stops', async () => {
    const { api, pushStatus } = createFakeApi();
    render(<App api={api} />);
    await screen.findByRole('tablist');

    act(() => pushStatus({ state: 'failed', message: 'The backend exited with code 1.' }));

    expect(screen.getByRole('alert')).toHaveTextContent('The backend exited with code 1.');
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('restarts the backend from the error screen', async () => {
    const { api } = createFakeApi({ state: 'failed', message: 'The backend exited with code 1.' });
    render(<App api={api} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Restart' }));

    expect(api.backend.restart).toHaveBeenCalledOnce();
  });

  it('prefers a pushed status over the initial query', async () => {
    const { api, pushStatus } = createFakeApi({ state: 'starting' });
    let resolveStatus!: (status: { state: 'starting' }) => void;
    api.backend.status.mockReturnValue(new Promise((resolve) => (resolveStatus = resolve)));
    render(<App api={api} />);

    act(() => pushStatus({ state: 'running' }));
    await act(async () => {
      resolveStatus({ state: 'starting' });
      await Promise.resolve();
    });

    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
