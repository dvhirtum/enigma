import { render } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import type { BombeState } from '../api';
import { MachineStoreProvider, useMachine } from '../store';
import { createFakeApi } from './fakeApi';

function Loaded({ children }: { children: ReactNode }) {
  const loadBombe = useMachine((store) => store.loadBombe);
  useEffect(() => {
    void loadBombe();
  }, [loadBombe]);
  return children;
}

type FakeApi = ReturnType<typeof createFakeApi>['api'];

/** Renders `ui` with a store that loads the Bombe job `state` from a fake API. `setup` adjusts the fake API before rendering. */
export function renderBombe(ui: ReactNode, state?: BombeState, setup?: (api: FakeApi) => void) {
  const { api } = createFakeApi();
  if (state) {
    api.bombe.getState.mockResolvedValue({ ok: true, value: state });
  }
  setup?.(api);
  render(
    <MachineStoreProvider api={api}>
      <Loaded>{ui}</Loaded>
    </MachineStoreProvider>,
  );
  return api;
}
