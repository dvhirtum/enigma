import { describe, expect, it } from 'vitest';
import { createMachineStore } from './store';
import { createFakeApi, defaultM3, fakeBook, fakeTables, generatedSheet, historicalSheet, summaryOf } from './test/fakeApi';

describe('key sheet store', () => {
  it('loads the list of key sheets', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);

    await store.getState().loadKeySheets();

    expect(store.getState().keySheets).toEqual([summaryOf(generatedSheet)]);
  });

  it('opens a generated sheet and refreshes the list', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);

    const generated = await store.getState().generateKeySheet('M4', 'Triton', '1944-06');

    expect(generated).toBe(true);
    expect(api.keySheets.generate).toHaveBeenCalledWith('M4', 'Triton', '1944-06');
    expect(store.getState().keySheet).toEqual(generatedSheet);
    expect(api.keySheets.list).toHaveBeenCalled();
  });

  it('reloads a Kenngruppenbuch after a sheet is generated, since the book may have allotted columns to it', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);
    await store.getState().loadBook(fakeBook.id);

    await store.getState().generateKeySheet('M4', 'Seehund', '1944-06');
    await store.getState().loadBook(fakeBook.id);

    expect(store.getState().books[fakeBook.id]).toEqual(fakeBook);
    expect(api.procedure.getBook).toHaveBeenCalledTimes(2);
  });

  it('keeps the open sheet and records the problem when a save is rejected', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'The operation was rejected.', detail: "Line 1: Unknown rotor 'IX'." };
    api.keySheets.update.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const saved = await store.getState().updateKeySheet('g1', 'Triton', '1944-06', '1 B I II IX 01 01 01');

    expect(saved).toBe(false);
    expect(store.getState().keySheet).toEqual(generatedSheet);
    expect(store.getState().error).toEqual(problem);
  });

  it('closes the sheet when it is deleted', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    await store.getState().deleteKeySheet('g1');

    expect(api.keySheets.remove).toHaveBeenCalledWith('g1');
    expect(store.getState().keySheet).toBeNull();
  });

  it('imports the file the user picks', async () => {
    const { api } = createFakeApi();
    const file = { network: 'Hydra', month: '1943-12', days: historicalSheet.days };
    api.files.openKeySheet.mockResolvedValue(JSON.stringify(file));
    const store = createMachineStore(api);

    const imported = await store.getState().importKeySheet();

    expect(imported).toBe(true);
    expect(api.keySheets.import).toHaveBeenCalledWith(file);
  });

  it('does nothing when the import is cancelled', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);

    const imported = await store.getState().importKeySheet();

    expect(imported).toBe(false);
    expect(api.keySheets.import).not.toHaveBeenCalled();
    expect(store.getState().error).toBeNull();
  });

  it('reports a file that is not JSON', async () => {
    const { api } = createFakeApi();
    api.files.openKeySheet.mockResolvedValue('not json');
    const store = createMachineStore(api);

    await store.getState().importKeySheet();

    expect(api.keySheets.import).not.toHaveBeenCalled();
    expect(store.getState().error).toMatchObject({ title: 'The file is not a key sheet.' });
  });

  it('exports the open sheet with its book and tables, without its id and provenance', async () => {
    const { api } = createFakeApi();
    api.files.saveKeySheet.mockResolvedValue('C:\\sheets\\Triton-1944-06.json');
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const exported = await store.getState().exportKeySheet();

    expect(exported).toBe(true);
    expect(api.keySheets.export).toHaveBeenCalledWith('g1');
    const [name, content] = api.files.saveKeySheet.mock.calls[0] as [string, string];
    expect(name).toBe('Triton-1944-06.json');
    expect(JSON.parse(content)).toEqual({
      network: 'Triton',
      month: '1944-06',
      days: generatedSheet.days,
      kenngruppenbuchId: 'book',
      tauschtafelSetId: 'tables',
      kenngruppenbuch: fakeBook,
      tauschtafeln: fakeTables,
    });
  });

  it('saves no file when the export fails', async () => {
    const { api } = createFakeApi();
    api.keySheets.export.mockResolvedValue({ ok: false, problem: { status: 404, title: 'Not found' } });
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const exported = await store.getState().exportKeySheet();

    expect(exported).toBe(false);
    expect(api.files.saveKeySheet).not.toHaveBeenCalled();
    expect(store.getState().error).toMatchObject({ title: 'Not found' });
  });

  it('prints the open sheet with its book and tables to a PDF', async () => {
    const { api } = createFakeApi();
    api.files.printKeySheet.mockResolvedValue('C:\\sheets\\Triton-1944-06.pdf');
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const printed = await store.getState().printKeySheet();

    expect(printed).toBe(true);
    expect(api.keySheets.export).toHaveBeenCalledWith('g1');
    const [name, html] = api.files.printKeySheet.mock.calls[0] as [string, string];
    expect(name).toBe('Triton-1944-06.pdf');
    expect(html).toContain('Schlüsseltafel für das Schlüsselnetz <b>TRITON</b>');
    expect(html).toContain('Spalten 101–120 · Triton');
    expect(html).toContain('Kenngruppen Z..');
    expect(html).toContain('Gültig 1.–15. Mai');
  });

  it('prints nothing when the export fails', async () => {
    const { api } = createFakeApi();
    api.keySheets.export.mockResolvedValue({ ok: false, problem: { status: 404, title: 'Not found' } });
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const printed = await store.getState().printKeySheet();

    expect(printed).toBe(false);
    expect(api.files.printKeySheet).not.toHaveBeenCalled();
    expect(store.getState().error).toMatchObject({ title: 'Not found' });
  });

  it('records the problem when the PDF cannot be saved', async () => {
    const { api } = createFakeApi();
    api.files.printKeySheet.mockRejectedValue(new Error('Disk full'));
    const store = createMachineStore(api);
    await store.getState().openKeySheet('g1');

    const printed = await store.getState().printKeySheet();

    expect(printed).toBe(false);
    expect(store.getState().error).toMatchObject({ title: 'The PDF could not be saved.' });
  });

  it('replaces the machine state when a daily key is applied', async () => {
    const { api } = createFakeApi();
    api.machine.applyDailyKey.mockResolvedValue({ ok: true, value: { ...defaultM3, model: 'M4', reflector: 'B-thin' } });
    const store = createMachineStore(api);

    const applied = await store.getState().applyDailyKey('g1', 1);

    expect(applied).toBe(true);
    expect(api.machine.applyDailyKey).toHaveBeenCalledWith('g1', 1);
    expect(store.getState().machine?.model).toBe('M4');
  });
});
