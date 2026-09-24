import { render } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import type { MachineState } from '../api';
import { MachineStoreProvider, useMachine } from '../store';
import { createFakeApi } from './fakeApi';

function Loaded({ children }: { children: ReactNode }) {
  const load = useMachine((store) => store.load);
  useEffect(() => {
    void load();
  }, [load]);
  return children;
}

type FakeApi = ReturnType<typeof createFakeApi>['api'];

/** Renders `ui` with a store that loads `state` from a fake API. `setup` adjusts the fake API before rendering. */
export function renderMachine(ui: ReactNode, state?: MachineState, setup?: (api: FakeApi) => void) {
  const { api } = createFakeApi();
  if (state) {
    api.machine.getState.mockResolvedValue({ ok: true, value: state });
  }
  setup?.(api);
  render(
    <MachineStoreProvider api={api}>
      <Loaded>{ui}</Loaded>
    </MachineStoreProvider>,
  );
  return api;
}
