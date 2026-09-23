import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('shows the backend version once connected', async () => {
    const api = { health: vi.fn().mockResolvedValue({ status: 'ok', version: '1.2.3' }) };

    render(<App api={api} />);

    expect(await screen.findByText('Backend connected (v1.2.3)')).toBeInTheDocument();
  });

  it('shows an error when the backend is unavailable', async () => {
    const api = { health: vi.fn().mockRejectedValue(new Error('offline')) };

    render(<App api={api} />);

    expect(await screen.findByText(/Backend unavailable: .*offline/)).toBeInTheDocument();
  });
});
