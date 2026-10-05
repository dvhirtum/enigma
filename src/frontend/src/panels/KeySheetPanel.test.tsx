import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultM3, generatedSheet, historicalSheet, summaryOf } from '../test/fakeApi';
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

    expect(await screen.findByRole('option', { name: 'Triton (generated)' })).toBeInTheDocument();
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
    const appliedKey = { sheetId: 'g1', network: 'Triton', month: '1944-06', day: 2, modified: true, grundstellung: null };
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

  it('offers no delete for a historical sheet', async () => {
    renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    expect(await screen.findByText('M3 · historical · Test transcription')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Print to PDF' })).toBeInTheDocument();
  });

  it('offers no way to create or edit a sheet by hand', async () => {
    renderMachine(<KeySheetPanel />);
    await openSheet();

    await screen.findByRole('listitem', { name: 'Day 1' });

    expect(screen.queryByRole('button', { name: 'New' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('groups the months by year and the sheets of the chosen month by machine', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, (fake) =>
      fake.keySheets.list.mockResolvedValue({
        ok: true,
        value: [
          summaryOf({ ...generatedSheet, id: 't2', month: '1944-07' }),
          summaryOf({ ...generatedSheet, id: 'd3', month: '1943-12' }),
          summaryOf({ ...generatedSheet, id: 'a1', network: 'Aegir' }),
          summaryOf({ ...generatedSheet, id: 'n3', network: 'Neptun', model: 'M3' }),
          summaryOf(generatedSheet),
          summaryOf(historicalSheet),
        ],
      }),
    );

    const month = await screen.findByRole('combobox', { name: 'Month' });
    await waitFor(() => expect(month).toHaveValue('1944-07'));
    const groupsOf = (name: string) =>
      [...screen.getByRole('combobox', { name }).querySelectorAll('optgroup')].map((group) => [
        group.label,
        [...group.querySelectorAll('option')].map((option) => option.textContent),
      ]);

    expect(groupsOf('Month')).toEqual([
      ['1944', ['June 1944', 'July 1944']],
      ['1943', ['December 1943']],
    ]);
    expect(groupsOf('Key sheet')).toEqual([['M4', ['Triton (generated)']]]);
    fireEvent.change(month, { target: { value: '1944-06' } });
    expect(groupsOf('Key sheet')).toEqual([
      ['M3', ['Hydra (historical)', 'Neptun (generated)']],
      ['M4', ['Aegir (generated)', 'Triton (generated)']],
    ]);
    expect(api.keySheets.get).not.toHaveBeenCalled();
  });

  it('shows the month of the open sheet', async () => {
    renderMachine(<KeySheetPanel />, undefined, (fake) =>
      fake.keySheets.list.mockResolvedValue({ ok: true, value: [summaryOf({ ...generatedSheet, id: 't2', month: '1944-07' }), summaryOf(generatedSheet)] }),
    );
    await screen.findByRole('option', { name: 'Triton (generated)' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), { target: { value: '1944-06' } });

    await openSheet('g1');

    await screen.findByRole('listitem', { name: 'Day 1' });
    expect(screen.getByRole('combobox', { name: 'Month' })).toHaveValue('1944-06');
    expect(screen.getByRole('combobox', { name: 'Key sheet' })).toHaveValue('g1');
  });

  it('closes the open sheet when another month is chosen', async () => {
    renderMachine(<KeySheetPanel />, undefined, (fake) =>
      fake.keySheets.list.mockResolvedValue({ ok: true, value: [summaryOf({ ...generatedSheet, id: 't2', month: '1944-07' }), summaryOf(generatedSheet)] }),
    );
    await screen.findByRole('option', { name: 'Triton (generated)' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), { target: { value: '1944-06' } });
    await openSheet('g1');
    await screen.findByRole('listitem', { name: 'Day 1' });

    fireEvent.change(screen.getByRole('combobox', { name: 'Month' }), { target: { value: '1944-07' } });

    await waitFor(() => expect(screen.queryByRole('listitem', { name: 'Day 1' })).not.toBeInTheDocument());
    expect(screen.getByRole('combobox', { name: 'Key sheet' })).toHaveValue('');
  });

  it('disables the selection when there are no sheets', async () => {
    renderMachine(<KeySheetPanel />, undefined, (fake) => fake.keySheets.list.mockResolvedValue({ ok: true, value: [] }));

    expect(await screen.findByRole('option', { name: 'No key sheets yet' })).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Month' })).toBeDisabled();
    expect(screen.getByRole('combobox', { name: 'Key sheet' })).toBeDisabled();
  });

  it('prints the open sheet with its Kenngruppenbuch and Tauschtafeln to a folder', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    fireEvent.click(await screen.findByRole('button', { name: 'Print to PDF' }));

    await waitFor(() =>
      expect(api.files.printToFolder).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Hydra-1944-06.pdf' }),
        expect.objectContaining({ name: 'Kenngruppenbuch-Tauschtafeln-1944.pdf' }),
      ]),
    );
  });

  it('prints only the open sheet when the Kenngruppenbuch is left out', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Also print the Kenngruppenbuch and Tauschtafeln' }));
    fireEvent.click(screen.getByRole('button', { name: 'Print to PDF' }));

    await waitFor(() =>
      expect(api.files.printKeySheet).toHaveBeenCalledWith('Hydra-1944-06.pdf', expect.stringContaining('Schlüsseltafel für das Schlüsselnetz')),
    );
    expect(api.files.printToFolder).not.toHaveBeenCalled();
  });

  it('prints the officer keys, Stichwort envelopes and Wetterkurzschlüssel when they are ticked', async () => {
    const api = renderMachine(<KeySheetPanel />, undefined, showHistorical);
    await openSheet('historical-hydra');

    fireEvent.click(await screen.findByRole('checkbox', { name: 'Also print the Kenngruppenbuch and Tauschtafeln' }));
    for (const name of ['Also print the Offizier key', 'Also print the Stab key', 'Also print the Stichwort envelopes', 'Also print the Wetterkurzschlüssel']) {
      fireEvent.click(screen.getByRole('checkbox', { name }));
    }
    fireEvent.click(screen.getByRole('button', { name: 'Print to PDF' }));

    await waitFor(() =>
      expect(api.files.printToFolder).toHaveBeenCalledWith([
        expect.objectContaining({ name: 'Hydra-1944-06.pdf' }),
        expect.objectContaining({ name: 'Offizier-Hydra-1944-06.pdf' }),
        expect.objectContaining({ name: 'Stab-Hydra-1944-06.pdf' }),
        expect.objectContaining({ name: 'Stichwort-1944.pdf' }),
        expect.objectContaining({ name: 'Wetterkurzschluessel-1944.pdf' }),
      ]),
    );
  });

  it('generates a year of sheets for the chosen model', async () => {
    const api = renderMachine(<KeySheetPanel />);

    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    const form = screen.getByRole('form', { name: 'Generate key sheets' });
    fireEvent.change(within(form).getByRole('combobox', { name: 'Model' }), { target: { value: 'M4' } });
    fireEvent.change(within(form).getByRole('spinbutton', { name: 'Year' }), { target: { value: '1944' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Generate' }));

    expect(api.keySheets.generate).toHaveBeenCalledWith('M4', 1944);
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument());
    expect(screen.queryByRole('textbox', { name: 'Network' })).not.toBeInTheDocument();
  });

  it('keeps the form open when generating is refused', async () => {
    const problem = { status: 400, title: 'The operation was rejected.', detail: 'Generated M3 key sheets for 1944 already exist.' };
    renderMachine(<KeySheetPanel />, undefined, (fake) => fake.keySheets.generate.mockResolvedValue({ ok: false, problem }));

    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    fireEvent.click(within(screen.getByRole('form', { name: 'Generate key sheets' })).getByRole('button', { name: 'Generate' }));

    expect(await screen.findByRole('form', { name: 'Generate key sheets' })).toBeInTheDocument();
  });

  it('generates once while a request is running', async () => {
    let finish: (value: unknown) => void = () => undefined;
    const api = renderMachine(<KeySheetPanel />, undefined, (fake) => fake.keySheets.generate.mockReturnValue(new Promise((resolve) => (finish = resolve))));

    fireEvent.click(await screen.findByRole('button', { name: 'Generate' }));
    const submit = within(screen.getByRole('form', { name: 'Generate key sheets' })).getByRole('button', { name: 'Generate' });
    fireEvent.click(submit);
    fireEvent.click(submit);

    expect(api.keySheets.generate).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    finish({ ok: true, value: [summaryOf(generatedSheet)] });
    await waitFor(() => expect(screen.queryByRole('form')).not.toBeInTheDocument());
  });

  it('deletes a sheet once confirmed', async () => {
    const api = renderMachine(<KeySheetPanel />);
    await openSheet();

    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    fireEvent.click(within(screen.getByRole('group', { name: 'Confirm delete' })).getByRole('button', { name: 'Delete' }));

    expect(api.keySheets.remove).toHaveBeenCalledWith('g1');
  });

  it('offers no viewers for the Kenngruppenbuch and Tauschtafeln', async () => {
    renderMachine(<KeySheetPanel />);
    await openSheet();

    await screen.findByRole('listitem', { name: 'Day 1' });

    expect(screen.queryByRole('button', { name: 'Kenngruppenbuch' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tauschtafeln' })).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Kenngruppenbuch' })).not.toBeInTheDocument();
  });
});
