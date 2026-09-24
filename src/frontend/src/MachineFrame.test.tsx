import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MachineFrame } from './MachineFrame';
import { MachineStoreProvider } from './store';
import { createFakeApi, defaultM3 } from './test/fakeApi';

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

    expect(await screen.findByLabelText('Machine')).toHaveTextContent(/^M3 · UKW B · I II III$/);
  });

  it('says so in the summary when the rotors are out', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, rotors: [] } });
    render(
      <MachineStoreProvider api={api}>
        <MachineFrame />
      </MachineStoreProvider>,
    );

    expect(await screen.findByLabelText('Machine')).toHaveTextContent('M3 · UKW B · rotors out');
  });

  it('marks an empty slot in the summary', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, rotors: defaultM3.rotors.filter((rotor) => rotor.slot !== 'Middle') } });
    render(
      <MachineStoreProvider api={api}>
        <MachineFrame />
      </MachineStoreProvider>,
    );

    expect(await screen.findByLabelText('Machine')).toHaveTextContent(/^M3 · UKW B · I – III$/);
  });

  it('creates a new machine when the model switch is confirmed', async () => {
    const api = renderFrame();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Model' }), { target: { value: 'M4' } });
    expect(api.machine.create).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

    expect(api.machine.create).toHaveBeenCalledWith('M4');
    expect(screen.queryByRole('group', { name: 'Confirm model switch' })).not.toBeInTheDocument();
  });

  it('keeps the machine when the model switch is cancelled', async () => {
    const api = renderFrame();
    const model = await screen.findByRole('combobox', { name: 'Model' });

    fireEvent.change(model, { target: { value: 'M4' } });
    expect(screen.getByRole('group', { name: 'Confirm model switch' })).toHaveTextContent('Switch to the M4? This resets the machine.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(api.machine.create).not.toHaveBeenCalled();
    expect(model).toHaveValue('M3');
  });

  it('disables the model switch while a key is held', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, heldKey: 'A', litLamp: 'B' } });
    render(
      <MachineStoreProvider api={api}>
        <MachineFrame />
      </MachineStoreProvider>,
    );

    expect(await screen.findByRole('combobox', { name: 'Model' })).toBeDisabled();
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
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Plugboard');
  });

  it('moves between tabs with the arrow keys', () => {
    renderFrame();
    screen.getByRole('tab', { name: 'Top-down' }).focus();

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Top-down' }), { key: 'ArrowUp' });

    expect(screen.getByRole('tab', { name: 'Plugboard' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Plugboard');
  });

  it('shows no daily key until one is applied', async () => {
    renderFrame();

    await screen.findByLabelText('Machine');

    expect(screen.queryByLabelText('Daily key')).not.toBeInTheDocument();
  });

  it.each([
    [false, 'Key: Triton 1944-06, day 19'],
    [true, 'Key: Triton 1944-06, day 19 (modified)'],
  ])('shows the applied sheet and day in the header (modified: %s)', async (modified, label) => {
    const { api } = createFakeApi();
    const appliedKey = { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 19, modified };
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, appliedKey } });
    render(
      <MachineStoreProvider api={api}>
        <MachineFrame />
      </MachineStoreProvider>,
    );

    expect(await screen.findByLabelText('Daily key')).toHaveTextContent(new RegExp(`^${label.replace(/[()]/g, '\\$&')}$`));
  });

  it('opens and closes the key sheet panel beside the view', async () => {
    renderFrame();
    const toggle = screen.getByRole('button', { name: 'Key sheets' });
    expect(screen.queryByRole('complementary', { name: 'Key sheets' })).not.toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(within(toggle).getByTestId('panel-icon-open')).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(within(toggle).getByTestId('panel-icon-close')).toBeInTheDocument();
    expect(await screen.findByRole('complementary', { name: 'Key sheets' })).toBeInTheDocument();
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();

    fireEvent.click(toggle);

    expect(screen.queryByRole('complementary', { name: 'Key sheets' })).not.toBeInTheDocument();
  });
});
