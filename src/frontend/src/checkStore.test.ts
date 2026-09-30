import { describe, expect, it } from 'vitest';
import type { ApiResult, BombeCheck, BombeStop, CheckChange } from './api';
import { createMachineStore, stopPage } from './store';
import { carterCheck, carterStops, createFakeApi } from './test/fakeApi';

/** A promise and the function that resolves it, to answer a call later. */
function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

/** A store with Carter's true stop open on the Checking view; setCheck answers with the change applied. */
async function openStore() {
  const { api } = createFakeApi();
  api.bombe.setCheck.mockImplementation((_stop: number, change: CheckChange) => Promise.resolve({ ok: true, value: { ...carterCheck, ...change } }));
  const store = createMachineStore(api);
  await store.getState().openCheck(0);
  return { api, store };
}

describe('checking in the machine store', () => {
  it('leaves the lamp dark when the key is released before the lamp comes back', async () => {
    const { api, store } = await openStore();
    const lamp = deferred<ApiResult<{ lamp: string }>>();
    api.bombe.pressCheckKey.mockReturnValueOnce(lamp.promise);

    const pressed = store.getState().pressCheckKey('Q');
    store.getState().releaseCheckKey();
    lamp.resolve({ ok: true, value: { lamp: 'R' } });
    await pressed;

    expect(store.getState().checkLamp).toBeNull();
  });

  it('keeps both pairs when two partners are typed before the first is saved', async () => {
    const { api, store } = await openStore();

    await Promise.all([store.getState().setPartner('A', 'D'), store.getState().setPartner('E', 'T')]);

    expect(api.bombe.setCheck).toHaveBeenLastCalledWith(0, { steckers: 'AD ET GQ' });
    expect(store.getState().check?.steckers).toBe('AD ET GQ');
  });

  it('keeps both pairs when two suggestions are accepted quickly', async () => {
    const { store } = await openStore();

    await Promise.all([store.getState().acceptSuggestion(['IK']), store.getState().acceptSuggestion(['OX'])]);

    expect(store.getState().check?.steckers).toBe('GQ IK OX');
  });

  it('drops a late reply for the stop checked before', async () => {
    const { api, store } = await openStore();
    const late = deferred<ApiResult<BombeCheck>>();
    api.bombe.setCheck.mockReturnValueOnce(late.promise);
    const second: BombeCheck = { ...carterCheck, stop: carterStops[1], machineRings: 'MUL' };
    api.bombe.getCheck.mockResolvedValueOnce({ ok: true, value: second });

    const turned = store.getState().stepCheckDrum(2, 1);
    await store.getState().openCheck(1);
    late.resolve({ ok: true, value: { ...carterCheck, machineWindows: 'ZZA' } });
    await turned;

    expect(store.getState().check?.stop.index).toBe(1);
    expect(store.getState().check?.machineRings).toBe('MUL');
  });

  it('drops a next page when the first page was loaded again meanwhile', async () => {
    const { api, store } = await openStore();
    const page = (from: number): BombeStop[] => Array.from({ length: stopPage }, (_, index) => ({ ...carterStops[0], index: from + index }));
    api.bombe.getStops.mockResolvedValueOnce({ ok: true, value: page(0) });
    await store.getState().loadStops();
    const next = deferred<ApiResult<BombeStop[]>>();
    api.bombe.getStops.mockReturnValueOnce(next.promise).mockResolvedValueOnce({ ok: true, value: page(0) });

    const more = store.getState().loadStops(true);
    await store.getState().loadStops();
    next.resolve({ ok: true, value: page(stopPage) });
    await more;

    expect(store.getState().stops).toHaveLength(stopPage);
  });
});
