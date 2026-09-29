import { useCallback, useEffect, useRef } from 'react';
import { alphabet } from './machine';
import { useActive } from './mode';
import { useMachine } from './store';

export interface Keys {
  /** Returns false when another key is already held down. */
  press: (letter: string) => boolean;
  release: () => void;
}

/**
 * Holds down one key at a time. Presses and releases reach the store in order with the other
 * queued operations, and a release is sent only for a press the backend accepted.
 */
export function useKeys(): Keys {
  const pressKey = useMachine((store) => store.pressKey);
  const releaseKey = useMachine((store) => store.releaseKey);
  const enqueue = useMachine((store) => store.enqueue);
  const held = useRef<string | null>(null);
  const accepted = useRef(false);

  const press = useCallback(
    (letter: string) => {
      if (held.current) {
        return false;
      }
      held.current = letter;
      void enqueue(async () => {
        accepted.current = await pressKey(letter);
      });
      return true;
    },
    [enqueue, pressKey],
  );

  const release = useCallback(() => {
    if (!held.current) {
      return;
    }
    held.current = null;
    void enqueue(async () => {
      if (accepted.current) {
        accepted.current = false;
        await releaseKey();
      }
    });
  }, [enqueue, releaseKey]);

  useEffect(() => release, [release]);

  return { press, release };
}

function isFormControl(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;
}

/** The key on the keyboard, whatever letter it types with the modifiers held. */
function physicalKey(event: KeyboardEvent): string {
  return event.code || event.key.toUpperCase();
}

/**
 * Presses the machine key for a letter typed on the physical keyboard, and releases it when that physical key goes up.
 * Does nothing while its frame is not the active mode.
 */
export function usePhysicalKeyboard({ press, release }: Keys): void {
  const active = useActive();

  useEffect(() => {
    if (!active) {
      return;
    }
    let down: string | null = null;

    const onKeyDown = (event: KeyboardEvent) => {
      const letter = event.key.toUpperCase();
      if (event.repeat || event.ctrlKey || event.altKey || event.metaKey || isFormControl(event.target)) {
        return;
      }
      if (letter.length !== 1 || !alphabet.includes(letter) || down) {
        return;
      }
      event.preventDefault();
      if (press(letter)) {
        down = physicalKey(event);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (down && physicalKey(event) === down) {
        down = null;
        release();
      }
    };

    const onBlur = () => {
      if (down) {
        down = null;
        release();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [active, press, release]);
}
