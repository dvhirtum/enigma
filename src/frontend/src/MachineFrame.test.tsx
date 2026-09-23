import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MachineFrame } from './MachineFrame';
import { MachineStoreProvider } from './store';
import { createFakeApi } from './test/fakeApi';

function renderFrame() {
  const { api } = createFakeApi();
  render(
    <MachineStoreProvider api={api}>
      <MachineFrame />
    </MachineStoreProvider>,
  );
  return api;
}

describe('MachineFrame', () => {
  it('shows a summary of the machine', async () => {
    renderFrame();

    expect(await screen.findByLabelText('Machine')).toHaveTextContent('M3 · UKW B · I II III · AAA');
  });

  it('starts on the top-down view', () => {
    renderFrame();

    expect(screen.getByRole('tab', { name: 'Top-down' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Top-down');
  });

  it('switches views when a tab is clicked', () => {
    renderFrame();

    fireEvent.click(screen.getByRole('tab', { name: 'Plugboard' }));

    expect(screen.getByRole('tab', { name: 'Plugboard' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('heading', { name: 'Plugboard' })).toBeInTheDocument();
  });

  it('moves between tabs with the arrow keys', () => {
    renderFrame();
    screen.getByRole('tab', { name: 'Top-down' }).focus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Top-down' }), { key: 'ArrowLeft' });

    expect(screen.getByRole('tab', { name: 'Plugboard' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Plugboard');
  });
});
