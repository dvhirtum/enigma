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

    const accepted = await store.getState().pressKey('A');

    expect(accepted).toBe(true);
    expect(api.machine.pressKey).toHaveBeenCalledWith('A');
    expect(store.getState().machine).toEqual(lit);
  });

  it('keeps the machine state and records the problem when an operation is rejected', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'The machine rejected the operation.', detail: 'Letter A is already plugged.' };
    api.machine.connectPlug.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().load();

    const accepted = await store.getState().connectPlug('AB');

    expect(accepted).toBe(false);
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

  it('steps a rotor from its position after the queued operations', async () => {
    const { api } = createFakeApi();
    const stepped = { ...defaultM3, rotors: defaultM3.rotors.map((rotor) => (rotor.slot === 'Right' ? { ...rotor, position: 'B' } : rotor)) };
    api.machine.pressKey.mockResolvedValue({ ok: true, value: stepped });
    const store = createMachineStore(api);
    await store.getState().load();

    void store.getState().enqueue(() => store.getState().pressKey('A'));
    const accepted = await store.getState().stepRotor('Right', -3);

    expect(accepted).toBe(true);
    expect(api.machine.turnRotor).toHaveBeenCalledWith('Right', 'Y');
  });

  it('does not step a rotor that is not inserted', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, rotors: [] } });
    const store = createMachineStore(api);
    await store.getState().load();

    const accepted = await store.getState().stepRotor('Right', 1);

    expect(accepted).toBe(false);
    expect(api.machine.turnRotor).not.toHaveBeenCalled();
  });

  it('steps the ring of a rotor in the box, wrapping from 26 to 1', async () => {
    const { api } = createFakeApi();
    api.machine.getState.mockResolvedValue({ ok: true, value: { ...defaultM3, rotorBox: [{ rotor: 'IV', ringSetting: 26, position: 'A', slot: null }] } });
    const store = createMachineStore(api);
    await store.getState().load();

    const accepted = await store.getState().stepRing('IV', 2);

    expect(accepted).toBe(true);
    expect(api.machine.setRingSetting).toHaveBeenCalledWith('IV', 2);
  });

  it('clears the problem when dismissed', async () => {
    const { api } = createFakeApi();
    api.machine.removeRotor.mockResolvedValue({ ok: false, problem: { status: 400, title: 'Rejected.' } });
    const store = createMachineStore(api);
    await store.getState().removeRotor('Left');

    store.getState().dismissError();

    expect(store.getState().error).toBeNull();
  });
});
