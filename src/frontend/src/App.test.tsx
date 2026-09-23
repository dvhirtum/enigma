import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { App } from './App';
import { createFakeApi } from './test/fakeApi';

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
    expect(await screen.findByText('Backend v1.2.3')).toBeInTheDocument();
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
