import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { OperatorState } from '../api';
import { defaultM3, sending } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { Notebook } from './Notebook';

const appliedKey = { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 1, modified: false, grundstellung: 'QRSA' };

function renderNotebook(operator: Partial<OperatorState> | null, modified = false) {
  return renderMachine(<Notebook />, {
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

const receiving: Partial<OperatorState> = {
  ...indicatorChosen,
  direction: 'Receive',
  step: 'TypeMessage',
  cipherText: 'ABCDEFGH',
  pad: 'WET',
  expectedKey: 'D',
};

describe('Notebook', () => {
  it('opens on the Encrypt page and asks for a daily key before sending', async () => {
    renderMachine(<Notebook />);

    expect(await screen.findByText(/Apply a daily key to send/)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Encrypt' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'Send a message' })).not.toBeInTheDocument();
  });

  it('receives on the Decrypt page without a daily key', async () => {
    renderMachine(<Notebook />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Decrypt' }));

    expect(screen.getByRole('form', { name: 'Receive a message' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Receive with applied key' })).not.toBeInTheDocument();
  });

  it('switches pages with the arrow keys', async () => {
    renderMachine(<Notebook />);

    fireEvent.keyDown(await screen.findByRole('tab', { name: 'Encrypt' }), { key: 'ArrowRight' });

    expect(screen.getByRole('tab', { name: 'Decrypt' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Decrypt' })).toHaveFocus();
  });

  it('warns when the setup differs from the daily key', async () => {
    renderNotebook(null, true);

    expect(await screen.findByRole('status')).toHaveTextContent('The machine setup differs from the daily key.');
    expect(screen.getByRole('button', { name: 'Send a message' })).toBeEnabled();
  });

  it('starts sending', async () => {
    const api = renderNotebook(null);

    fireEvent.click(await screen.findByRole('button', { name: 'Send a message' }));

    expect(api.machine.startSending).toHaveBeenCalled();
  });

  it('opens on the page of the message in progress', async () => {
    renderNotebook(receiving);

    expect(await screen.findByRole('tab', { name: 'Decrypt' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('group', { name: 'Cipher text' })).toBeInTheDocument();
  });

  it('shows the other page but asks to finish the message in progress first', async () => {
    renderNotebook(receiving);

    fireEvent.click(await screen.findByRole('tab', { name: 'Encrypt' }));
    expect(screen.getByRole('status')).toHaveTextContent('A message is being decrypted. Finish or cancel it on the Decrypt page first.');
    expect(screen.queryByRole('button', { name: 'Send a message' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Decrypt' }));

    expect(screen.getByRole('tab', { name: 'Decrypt' })).toHaveAttribute('aria-selected', 'true');
  });

  it('starts a message on the other page once the message on this page is done', async () => {
    const api = renderNotebook({ ...receiving, step: 'Done', pad: 'WETTERXX' });

    fireEvent.click(await screen.findByRole('tab', { name: 'Encrypt' }));
    expect(screen.queryByText(/A message is being/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Send a message' }));

    expect(api.machine.startSending).toHaveBeenCalled();
  });

  it('finds the keys that fit a received message on the applied day and receives with the chosen one', async () => {
    const message = 'QWER TZUI ABCD QWER TZUI';
    const keys = [
      { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 1, model: 'M4', schluesselkenngruppe: 'DWA' },
      { sheetId: 'g2', network: 'Triton', month: '1944-06', day: 1, model: 'M3', schluesselkenngruppe: 'DWA' },
    ];
    const api = renderNotebook(null);
    api.procedure.findReceivingKeys.mockResolvedValue({ ok: true, value: keys });

    fireEvent.click(await screen.findByRole('tab', { name: 'Decrypt' }));
    const form = screen.getByRole('form', { name: 'Receive a message' });
    expect(within(form).getByLabelText('Date')).toHaveValue('1944-06-01');
    fireEvent.change(within(form).getByRole('textbox', { name: 'Received message' }), { target: { value: message } });
    fireEvent.click(within(form).getByRole('button', { name: 'Find key' }));
    const list = await screen.findByRole('list', { name: 'Matching keys' });
    fireEvent.click(within(within(list).getAllByRole('listitem')[1]).getByRole('button', { name: 'Receive with this key' }));

    expect(api.procedure.findReceivingKeys).toHaveBeenCalledWith(message, '1944-06-01');
    expect(api.machine.startReceiving).toHaveBeenCalledWith(message, 'g2', 1);
  });

  it('receives with the applied key without looking it up', async () => {
    const api = renderNotebook(null);

    fireEvent.click(await screen.findByRole('tab', { name: 'Decrypt' }));
    const form = screen.getByRole('form', { name: 'Receive a message' });
    expect(within(form).getByRole('button', { name: 'Receive with applied key' })).toBeDisabled();
    fireEvent.change(within(form).getByRole('textbox', { name: 'Received message' }), { target: { value: 'QWER TZUI ABCD QWER TZUI' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Receive with applied key' }));

    expect(api.machine.startReceiving).toHaveBeenCalledWith('QWER TZUI ABCD QWER TZUI', undefined, undefined);
    expect(api.procedure.findReceivingKeys).not.toHaveBeenCalled();
  });

  it('says when no key sheet fits the received message', async () => {
    renderMachine(<Notebook />);

    fireEvent.click(await screen.findByRole('tab', { name: 'Decrypt' }));
    const form = screen.getByRole('form', { name: 'Receive a message' });
    fireEvent.change(within(form).getByLabelText('Date'), { target: { value: '1944-06-19' } });
    fireEvent.change(within(form).getByRole('textbox', { name: 'Received message' }), { target: { value: 'QWER TZUI ABCD QWER TZUI' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Find key' }));

    expect(await screen.findByRole('status')).toHaveTextContent('No key sheet for 1944-06-19 fits this message.');
  });

  it('picks the groups from the network and Verfahrenkenngruppen columns', async () => {
    const api = renderNotebook({});

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
    const api = renderNotebook({});

    fireEvent.click(await screen.findByRole('button', { name: 'Random' }));
    fireEvent.click(screen.getByRole('button', { name: 'Encrypt indicator' }));

    expect(api.machine.chooseGroups).toHaveBeenCalledWith('DWA', 'AAA', 'QX');
    vi.restoreAllMocks();
  });

  it('ticks off the finished steps and writes out the indicator', async () => {
    renderNotebook({ ...indicatorChosen, step: 'SetGrundstellung' });

    const current = await screen.findByRole('listitem', { current: 'step' });
    expect(current).toHaveAccessibleName('Set the Grundstellung');
    expect(current).not.toHaveAttribute('data-done');
    expect(within(current).getByRole('group', { name: 'Grundstellung' })).toHaveTextContent('QRSA');
    const chosen = screen.getByRole('listitem', { name: 'Choose the groups' });
    expect(chosen).toHaveAttribute('data-done');
    expect(within(chosen).getByRole('group', { name: 'Schlüsselkenngruppe' })).toHaveTextContent('DWA');
    expect(within(chosen).getByRole('group', { name: 'Verfahrenkenngruppe' })).toHaveTextContent('AAB');
    expect(within(chosen).getByRole('group', { name: 'Fillers' })).toHaveTextContent('QX');
    const indicator = await within(chosen).findByRole('region', { name: 'Indicator' });
    expect(within(indicator).getByRole('group', { name: 'Upper row' })).toHaveTextContent('QDWA');
    expect(within(indicator).getByRole('group', { name: 'Lower row' })).toHaveTextContent('AABX');
    expect(within(indicator).getByLabelText('Swaps')).toHaveTextContent('QA→JZ');
    expect(within(indicator).getByRole('group', { name: 'Groups' })).toHaveTextContent('JWDZ ZZYC');
  });

  it('writes down the lamps of the Spruchschlüssel while the Verfahrenkenngruppe is typed', async () => {
    renderNotebook({ ...indicatorChosen, step: 'TypeVerfahrenkenngruppe', spruchschluesselLamps: 'QK', expectedKey: 'B' });

    const current = await screen.findByRole('listitem', { current: 'step' });
    expect(within(current).getByRole('group', { name: 'Lamps' })).toHaveTextContent('QK');
    expect(current).toHaveTextContent('Next: B.');
    expect(screen.getByRole('listitem', { name: 'Set the Spruchschlüssel' })).toHaveTextContent(/^Set the Spruchschlüssel$/);
  });

  it('keeps every step written out once the message is done', async () => {
    const message = '1840 = 24 = JWDZ ZZYC ABCD EFGH JWDZ ZZYC';
    renderNotebook({ ...indicatorChosen, step: 'Done', spruchschluesselLamps: 'QKL', spruchschluessel: 'QKL', pad: 'ABCDEFGH', message });

    const steps = await screen.findAllByRole('listitem');
    expect(steps.slice(0, 6).every((step) => step.hasAttribute('data-done'))).toBe(true);
    expect(await screen.findByRole('region', { name: 'Indicator' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Grundstellung' })).toHaveTextContent('QRSA');
    expect(screen.getByRole('group', { name: 'Lamps' })).toHaveTextContent('QKL');
    expect(screen.getByRole('group', { name: 'Spruchschlüssel' })).toHaveTextContent('QKL');
    expect(screen.getByRole('group', { name: 'Cipher text' })).toHaveTextContent('ABCD EFGH');
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
  });

  it('asks for X to fill the last group before finishing', async () => {
    renderNotebook({ ...indicatorChosen, step: 'TypeMessage', spruchschluessel: 'QKLM', pad: 'ABCDEF', fillersNeeded: 2 });

    expect(await screen.findByRole('status')).toHaveTextContent('Type X 2 more time(s) to fill the last group.');
    expect(screen.getByRole('button', { name: 'Finish' })).toBeDisabled();
    expect(screen.getByRole('group', { name: 'Cipher text' })).toHaveTextContent('ABCD EF');
  });

  it('shows the radio message to copy when sending is done', async () => {
    const message = '1840 = 24 = JWDZ ZZYC ABCD EFGH JWDZ ZZYC';
    const api = renderNotebook({ ...indicatorChosen, step: 'Done', pad: 'ABCDEFGH', message });

    expect(await screen.findByRole('status', { name: 'Radio message' })).toHaveTextContent(message);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New message' }));

    expect(api.clipboard.writeText).toHaveBeenCalledWith(message);
    expect(api.machine.cancelOperator).toHaveBeenCalled();
  });

  it('writes the plaintext under the cipher text, circles the next letter and lists warnings when receiving', async () => {
    renderNotebook({ ...receiving, warnings: ['The preamble gives 30 letters, but the message has 24.'] });

    const cipher = await screen.findByRole('group', { name: 'Cipher text' });
    expect(within(cipher).getByText('D')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('group', { name: 'Plaintext' })).toHaveTextContent('WET');
    expect(screen.getByRole('list', { name: 'Warnings' })).toHaveTextContent('The preamble gives 30 letters');
    expect(screen.queryByText('Choose the groups')).not.toBeInTheDocument();
  });

  it('explains which network and columns the indicator groups point to when receiving', async () => {
    renderNotebook({ ...receiving, step: 'TypeVerfahrenkenngruppe', pad: '', expectedKey: 'A' });

    const step = await screen.findByRole('listitem', { name: 'Type the Verfahrenkenngruppe' });
    expect(await within(step).findByText(/Columns 101–120 are allotted to Triton/)).toHaveTextContent(
      'Schlüsselkenngruppe DWA, which stands in column 101 of the Kenngruppenbuch. Columns 101–120 are allotted to Triton, so the message belongs to that network',
    );
    expect(within(step).getByText(/The lower row holds/)).toHaveTextContent('Verfahrenkenngruppe AAB and a filler. The Verfahrenkenngruppe stands in column 1, one of the Verfahrenkenngruppen columns 1–100.');
    expect(within(step).getByText(/The indicator groups/)).toHaveTextContent('JWDZ ZZYC');
  });

  it('presses the machine key for a letter typed in the notebook', async () => {
    const api = renderNotebook(receiving);
    await screen.findByRole('group', { name: 'Cipher text' });

    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' });
    fireEvent.keyUp(window, { key: 'd', code: 'KeyD' });

    await vi.waitFor(() => expect(api.machine.releaseKey).toHaveBeenCalled());
    expect(api.machine.pressKey).toHaveBeenCalledWith('D');
  });
});
