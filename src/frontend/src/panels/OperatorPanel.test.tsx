import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OperatorState } from '../api';
import { defaultM3, sending } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { OperatorPanel } from './OperatorPanel';

const appliedKey = { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 1, modified: false };

function renderOperator(operator: Partial<OperatorState> | null, modified = false) {
  return renderMachine(<OperatorPanel />, {
    ...defaultM3,
    appliedKey: { ...appliedKey, modified },
    operator: operator && { ...sending, ...operator },
  });
}

const indicatorChosen: Partial<OperatorState> = {
  schluesselkenngruppe: 'DWA',
  verfahrenkenngruppe: 'AAB',
  bigrams: [
    { from: 'QA', to: 'JZ' },
    { from: 'DA', to: 'WZ' },
    { from: 'WB', to: 'DY' },
    { from: 'AX', to: 'ZC' },
  ],
  indicator: 'JWDZ ZZYC',
};

describe('OperatorPanel', () => {
  it('asks for a daily key first', () => {
    renderMachine(<OperatorPanel />);

    expect(screen.getByText(/Apply a daily key first/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send a message' })).not.toBeInTheDocument();
  });

  it('warns when the setup differs from the daily key', async () => {
    renderOperator(null, true);

    expect(await screen.findByRole('status')).toHaveTextContent('The machine setup differs from the daily key.');
    expect(screen.getByRole('button', { name: 'Send a message' })).toBeEnabled();
  });

  it('starts sending or receiving', async () => {
    const api = renderOperator(null);

    fireEvent.click(await screen.findByRole('button', { name: 'Send a message' }));
    const form = screen.getByRole('form', { name: 'Receive a message' });
    fireEvent.change(within(form).getByRole('textbox', { name: 'Received message' }), { target: { value: 'QWER TZUI ABCD QWER TZUI' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Receive' }));

    expect(api.machine.startSending).toHaveBeenCalled();
    expect(api.machine.startReceiving).toHaveBeenCalledWith('QWER TZUI ABCD QWER TZUI');
  });

  it('picks the groups from the network and Verfahrenkenngruppen columns', async () => {
    const api = renderOperator({});

    const schluessel = await screen.findByRole('group', { name: 'Schlüsselkenngruppe, column 101' });
    fireEvent.click(within(schluessel).getByRole('button', { name: 'DWC' }));
    const picker = screen.getByRole('group', { name: 'Verfahrenkenngruppe' });
    fireEvent.change(within(picker).getByRole('combobox', { name: 'Column' }), { target: { value: '100' } });
    expect(screen.getByRole('button', { name: 'Encrypt indicator' })).toBeDisabled();
    const verfahren = screen.getByRole('group', { name: 'Verfahrenkenngruppe, column 100' });
    fireEvent.click(within(verfahren).getByRole('button', { name: 'DVB' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt indicator' }));

    expect(within(schluessel).getByRole('button', { name: 'DWC' })).toHaveAttribute('aria-pressed', 'true');
    expect(api.machine.chooseGroups).toHaveBeenCalledWith('DWC', 'DVB', 'QX');
  });

  it('fills both groups at random', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const api = renderOperator({});

    fireEvent.click(await screen.findByRole('button', { name: 'Random' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt indicator' }));

    expect(api.machine.chooseGroups).toHaveBeenCalledWith('DWA', 'AAA', 'QX');
    vi.restoreAllMocks();
  });

  it('shows the current step and the indicator', async () => {
    renderOperator({ ...indicatorChosen, step: 'SetGrundstellung' });

    expect(await screen.findByRole('listitem', { current: 'step' })).toHaveTextContent('Set the Grundstellung');
    expect(screen.getByText(/Set the rotor windows to the Grundstellung/)).toHaveTextContent('Q R S A');
    const indicator = screen.getByRole('region', { name: 'Indicator' });
    expect(indicator).toHaveTextContent('Q D W A');
    expect(indicator).toHaveTextContent('A A B X');
    expect(indicator).toHaveTextContent('QA→JZ');
    expect(indicator).toHaveTextContent('JWDZ ZZYC');
  });

  it('asks for X to fill the last group before finishing', async () => {
    renderOperator({ ...indicatorChosen, step: 'TypeMessage', spruchschluessel: 'QKLM', pad: 'ABCDEF', fillersNeeded: 2 });

    expect(await screen.findByText('Type X 2 more time(s) to fill the last group.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
    expect(screen.getByRole('region', { name: 'Message pad' })).toHaveTextContent('ABCD EF');
  });

  it('shows the radio message to copy when sending is done', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const message = '1840 = 24 = JWDZ ZZYC ABCD EFGH JWDZ ZZYC';
    const api = renderOperator({ ...indicatorChosen, step: 'Done', pad: 'ABCDEFGH', message });

    expect(await screen.findByRole('status', { name: 'Radio message' })).toHaveTextContent(message);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New message' }));

    expect(writeText).toHaveBeenCalledWith(message);
    expect(api.machine.cancelOperator).toHaveBeenCalled();
  });

  it('highlights the next cipher letter and lists warnings when receiving', async () => {
    renderOperator({
      ...indicatorChosen,
      direction: 'Receive',
      step: 'TypeMessage',
      cipherText: 'ABCDEFGH',
      pad: 'WET',
      expectedKey: 'D',
      warnings: ['The preamble gives 30 letters, but the message has 24.'],
    });

    const cipher = await screen.findByLabelText('Cipher text');
    expect(within(cipher).getByText('D')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('list', { name: 'Warnings' })).toHaveTextContent('The preamble gives 30 letters');
    expect(screen.getByRole('region', { name: 'Message pad' })).toHaveTextContent('WET');
    expect(screen.queryByRole('listitem', { name: 'Choose the groups' })).not.toBeInTheDocument();
  });
});
