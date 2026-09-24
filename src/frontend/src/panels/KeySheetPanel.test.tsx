import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultM3, historicalSheet, summaryOf } from '../test/fakeApi';
import { renderMachine } from '../test/renderMachine';
import { KeySheetPanel } from './KeySheetPanel';

function showHistorical(api: ReturnType<typeof renderMachine>) {
  api.keySheets.list.mockResolvedValue({ ok: true, value: [summaryOf(historicalSheet)] });
  api.keySheets.get.mockResolvedValue({ ok: true, value: historicalSheet });
}

async function openSheet(id = 'g1') {
  fireEvent.change(await screen.findByRole('combobox', { name: 'Key sheet' }), { target: { value: id } });
}

describe('KeySheetPanel', () => {
  it('lists the key sheets with their model and provenance', async () => {
    renderMachine(<KeySheetPanel />);

    expect(await screen.findByRole('option', { name: 'Triton 1944-06 · M4 (generated)' })).toBeInTheDocument();
  });

  it('shows the daily keys of the chosen sheet', async () => {
    renderMachine(<KeySheetPanel />);

    await openSheet();

    const day = await screen.findByRole('listitem', { name: 'Day 1' });
    expect(day).toHaveTextContent('UKW B-thin · Beta II IV I · 01 01 01 22');
    expect(day).toHaveTextContent('AT BL DF');
    expect(day).toHaveTextContent('Grundstellung QRSA');
  });

  it('marks the day applied to the machine', async () => {
    const appliedKey = { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 2, modified: true };
    renderMachine(<KeySheetPanel />, { ...defaultM3, appliedKey });
    await openSheet();

    const day = await screen.findByRole('listitem', { name: 'Day 2' });
    expect(day).toHaveAttribute('aria-current', 'true');
    expect(day).toHaveTextContent('Applied, since modified');
    expect(screen.getByRole('listitem', { name: 'Day 1' })).not.toHaveAttribute('aria-current');
  });

  it('asks before applying a key for the other model', async () => {
    const api = renderMachine(<KeySheetPanel />);
    await openSheet();

    fireEvent.click(within(await screen.findByRole('listitem', { name: 'Day 2' })).getByRole('button', { name: 'Apply' }));
    expect(api.machine.applyDailyKey).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Switch' }));

    expect(api.machine.applyDailyKey).toHaveBeenCalledWith('g1', 2);
  });

  it('applies a key for the same model at once', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    fireEvent.click(within(await screen.findByRole('listitem', { name: 'Day 26' })).getByRole('button', { name: 'Apply' }));

    expect(api.machine.applyDailyKey).toHaveBeenCalledWith('historical-hydra', 26);
  });

  it('offers no edit or delete for a historical sheet', async () => {
    renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    expect(await screen.findByText('M3 · historical · Test transcription')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('generates a sheet for the chosen model, network and month', async () => {
    const api = renderMachine(<KeySheetPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    const form = screen.getByRole('form', { name: 'Generate key sheet' });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Model' }), { target: { value: 'M4' } });
    fireEvent.change(within(form).getByRole('textbox', { name: 'Network' }), { target: { value: 'Triton' } });
    fireEvent.change(within(form).getByLabelText('Month'), { target: { value: '1944-06' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Generate' }));

    expect(api.keySheets.generate).toHaveBeenCalledWith('M4', 'Triton', '1944-06');
    expect(await screen.findByRole('listitem', { name: 'Day 1' })).toBeInTheDocument();
    expect(screen.queryByRole('form')).not.toBeInTheDocument();
  });

  it('edits a sheet as text rows', async () => {
    const api = renderMachine(<KeySheetPanel />);
    await openSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('form', { name: 'Edit key sheet' });
    const text = within(form).getByRole('textbox', { name: 'Daily keys' });
    expect(text).toHaveValue('1 B-thin Beta II IV I 01 01 01 22 AT BL DF QRSA\n2 B-thin Beta II IV I 01 01 01 22 CO\n');
    fireEvent.change(text, { target: { value: '3 B I II VI 01 02 03' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(api.keySheets.update).toHaveBeenCalledWith('g1', 'Triton', '1944-06', '3 B I II VI 01 02 03');
  });

  it('keeps the editor open when the backend rejects the rows', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, (fake) => fake.keySheets.create.mockResolvedValue({ ok: false, problem: { status: 400, title: 'The operation was rejected.', detail: 'Line 1: Unknown rotor.' } }));

    fireEvent.click(await screen.findByRole('button', { name: 'New' }));
    const form = screen.getByRole('form', { name: 'New key sheet' });
    fireEvent.change(within(form).getByRole('textbox', { name: 'Network' }), { target: { value: 'Hydra' } });
    fireEvent.change(within(form).getByRole('textbox', { name: 'Daily keys' }), { target: { value: '1 B I II IX' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('form', { name: 'New key sheet' })).toBeInTheDocument();
    expect(api.keySheets.create).toHaveBeenCalledWith('Hydra', expect.stringMatching(/^\d{4}-\d{2}$/), '1 B I II IX');
  });

  it('deletes a sheet once confirmed', async () => {
    const api = renderMachine(<KeySheetPanel />);
    await openSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm delete' })).getByRole('button', { name: 'Delete' }));

    expect(api.keySheets.remove).toHaveBeenCalledWith('g1');
  });

  it('shows the linked Kenngruppenbuch and the Tauschtafel in force for a day', async () => {
    renderMachine(<KeySheetPanel />);
    await openSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Kenngruppenbuch' }));
    const book = await screen.findByRole('region', { name: 'Kenngruppenbuch' });
    expect(within(book).getByRole('row', { name: 'Triton 101–120' })).toBeInTheDocument();
    fireEvent.change(within(book).getByRole('spinbutton', { name: 'Column' }), { target: { value: '101' } });
    expect(within(book).getByLabelText('Column 101')).toHaveTextContent(/^DWA DWB/);

    fireEvent.click(screen.getByRole('button', { name: 'Tauschtafeln' }));
    const tables = await screen.findByRole('region', { name: 'Tauschtafeln' });
    expect(within(tables).getByRole('heading')).toHaveTextContent('Tauschtafel 2 (1944)');
    expect(within(tables).getByLabelText('Tauschtafel 2')).toHaveTextContent('AA=ZZ AB=ZY AC=BQ');
    fireEvent.change(within(tables).getByRole('combobox', { name: 'Day' }), { target: { value: '2' } });
    expect(within(tables).getByRole('heading')).toHaveTextContent('Tauschtafel 2 (1944)');
  });
});
