import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { createMachineStore, MachineStoreProvider, useMachine } from './store';
import { carterBombe, carterMenu, carterPaused, createFakeApi, defaultM3, intercepts, withCrib } from './test/fakeApi';

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

  it('loads a Kenngruppenbuch once and keeps it', async () => {
    const { api } = createFakeApi();
    const store = createMachineStore(api);

    await store.getState().loadBook('book');
    await store.getState().loadBook('book');

    expect(api.procedure.getBook).toHaveBeenCalledTimes(1);
    expect(store.getState().books.book.allotments[0].network).toBe('Triton');
  });
});

describe('machine store provider', () => {
  it('forgets the Kenngruppenbuecher and reloads the key sheets when another window changes the key sheets', async () => {
    const { api, pushKeySheetsChanged } = createFakeApi();
    const wrapper = ({ children }: { children: ReactNode }) => createElement(MachineStoreProvider, { api, children });
    const { result } = renderHook(() => useMachine((store) => store), { wrapper });
    await act(() => result.current.loadBook('book'));

    act(() => pushKeySheetsChanged());

    expect(result.current.books).toEqual({});
    await waitFor(() => expect(api.keySheets.list).toHaveBeenCalledTimes(1));
    await act(() => result.current.loadBook('book'));
    expect(api.procedure.getBook).toHaveBeenCalledTimes(2);
  });
});

describe('bombe slice', () => {
  it('loads the job and the intercepts', async () => {
    const { api } = createFakeApi();
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterBombe });
    const store = createMachineStore(api);

    const loaded = await store.getState().loadBombe();

    expect(loaded).toBe(true);
    expect(store.getState().bombe).toEqual(carterBombe);
    expect(store.getState().intercepts).toEqual(intercepts);
  });

  it('replaces the job after an operation', async () => {
    const { api } = createFakeApi();
    const placed = withCrib(carterBombe, 'WETTER', 1);
    api.bombe.placeCrib.mockResolvedValue({ ok: true, value: placed });
    const store = createMachineStore(api);

    const accepted = await store.getState().placeCrib(1);

    expect(accepted).toBe(true);
    expect(api.bombe.placeCrib).toHaveBeenCalledWith(1);
    expect(store.getState().bombe).toEqual(placed);
  });

  it('keeps the job and records the problem when an operation is rejected', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'Generate or import M3 key sheets first.' };
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterBombe });
    api.bombe.generateExercise.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().loadBombe();

    const accepted = await store.getState().generateExercise();

    expect(accepted).toBe(false);
    expect(store.getState().bombe).toEqual(carterBombe);
    expect(store.getState().error).toEqual(problem);
  });
});

describe('bombe runs', () => {
  it('keeps the run with the job', async () => {
    const { api } = createFakeApi();
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterMenu });
    api.bombe.startRun.mockResolvedValue({ ok: true, value: carterPaused });
    const store = createMachineStore(api);
    await store.getState().loadBombe();

    await store.getState().startRun(null);

    expect(api.bombe.startRun).toHaveBeenCalledWith(null);
    expect(store.getState().bombe).toEqual({ ...carterMenu, run: carterPaused });
  });

  it('leaves the error alone when a poll succeeds', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'Cancel the run before changing the job.' };
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterMenu });
    api.bombe.setCrib.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().loadBombe();
    await store.getState().setCrib('WETTER');

    await store.getState().pollRun();

    expect(store.getState().error).toEqual(problem);
    expect(store.getState().bombe?.run?.status).toBe('Running');
  });

  it('keeps the speed for the next run, and sends it to a running one', async () => {
    const { api } = createFakeApi();
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterMenu });
    const store = createMachineStore(api);
    await store.getState().loadBombe();

    await store.getState().chooseSpeed(1000);
    expect(api.bombe.setRunSpeed).not.toHaveBeenCalled();
    await store.getState().startRun(store.getState().speed);
    await store.getState().chooseSpeed(null);

    expect(api.bombe.startRun).toHaveBeenCalledWith(1000);
    expect(api.bombe.setRunSpeed).toHaveBeenCalledWith(null);
    expect(store.getState().speed).toBeNull();
  });
});

describe('bombe slice loading', () => {
  it('loads the job when the intercepts cannot be listed', async () => {
    const { api } = createFakeApi();
    const problem = { status: 500, title: 'The intercepts could not be listed.' };
    api.bombe.getState.mockResolvedValue({ ok: true, value: carterBombe });
    api.bombe.intercepts.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);

    const loaded = await store.getState().loadBombe();

    expect(loaded).toBe(false);
    expect(store.getState().bombe).toEqual(carterBombe);
    expect(store.getState().error).toEqual(problem);
  });

  it('keeps an earlier error when the job loads', async () => {
    const { api } = createFakeApi();
    const problem = { status: 400, title: 'The machine rejected the operation.' };
    api.machine.getState.mockResolvedValue({ ok: false, problem });
    const store = createMachineStore(api);
    await store.getState().load();

    await store.getState().loadBombe();

    expect(store.getState().error).toEqual(problem);
  });
});
