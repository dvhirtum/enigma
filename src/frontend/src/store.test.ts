import { describe, expect, it } from 'vitest';
import { createMachineStore } from './store';
import { createFakeApi, defaultM3 } from './test/fakeApi';

describe('machine store', () => {
  it('loads the machine state and backend version', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);

    await store.getState().load();

    expect(store.getState().machine).toEqual(defaultM3);
    expect(store.getState().version).toBe('1.2.3');
  });

  it('replaces the machine state after an operation', async () => {
    const { api } = createFakeApi();
    const lit = { ...defaultM3, heldKey: 'A', litLamp: 'B' };
    api.machine.pressKey.mockResolvedValue({ ok: true, value: lit });
    const store = createMachineStore(api);

    await store.getState().pressKey('A');

    expect(api.machine.pressKey).toHaveBeenCalledWith('A');
    expect(store.getState().machine).toEqual(lit);
  });

  it('keeps the machine state and records the problem when an operation is rejected', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'The machine rejected the operation.', detail: 'Letter A is already plugged.' };
    api.machine.connectPlug.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().load();

    await store.getState().connectPlug('AB');

    expect(store.getState().machine).toEqual(defaultM3);
    expect(store.getState().error).toEqual(problem);
  });

  it('records a problem when the IPC call throws', async () => {
    const { api } = createFakeApi();
    api.machine.releaseKey.mockRejectedValue(new Error('channel closed'));
    const store = createMachineStore(api);

    await store.getState().releaseKey();

    expect(store.getState().error).toMatchObject({ status: 0, detail: 'Error: channel closed' });
  });

  it('clears the problem when dismissed', async () => {
    const { api } = createFakeApi();
    api.machine.removeRotors.mockResolvedValue({ ok: false, problem: { status: 400, title: 'Rejected.' } });
    const store = createMachineStore(api);
    await store.getState().removeRotors();

    store.getState().dismissError();

    expect(store.getState().error).toBeNull();
  });
});
