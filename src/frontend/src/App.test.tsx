import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the machine name', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'Navy Enigma' })).toBeInTheDocument();
  });
});
