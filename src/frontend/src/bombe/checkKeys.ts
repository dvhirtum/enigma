import { useCallback, useRef } from 'react';
import { useMachine } from '../store';
import type { Keys } from '../useKeys';

/**
 * Presses one key at a time on the checking machine, once its reflector and drums are fitted; the lamp stays lit while
 * the key is held. Used by the machine window and by the Hut 8 notebook while a stop is checked.
 */
export function useCheckKeys(): Keys {
  const ready = useMachine((store) => {
    const checker = store.bombe?.checker;
    return Boolean(checker?.reflector && checker.dummy && checker.drums.every(Boolean));
  });
  const pressCheckKey = useMachine((store) => store.pressCheckKey);
  const releaseCheckKey = useMachine((store) => store.releaseCheckKey);
  const held = useRef<string | null>(null);

  const press = useCallback(
    (letter: string) => {
      if (held.current || !ready) {
        return false;
      }
      held.current = letter;
      void pressCheckKey(letter);
      return true;
    },
    [pressCheckKey, ready],
  );
  const release = useCallback(() => {
    if (held.current) {
      held.current = null;
      releaseCheckKey();
    }
  }, [releaseCheckKey]);

  return { press, release };
}
