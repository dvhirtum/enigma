import { useRef, type PointerEvent } from 'react';
import type { Keys } from '../useKeys';

export const keyRadius = 23;

interface KeyProps {
  letter: string;
  down: boolean;
  x: number;
  y: number;
  keys: Keys;
}

/** A keyboard key. It stays down while the mouse button is held. */
export function Key({ letter, down, x, y, keys }: KeyProps) {
  const pressed = useRef(false);

  const onPointerDown = (event: PointerEvent<SVGGElement>) => {
    if (event.button !== 0 || !keys.press(letter)) {
      return;
    }
    pressed.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerUp = () => {
    if (pressed.current) {
      pressed.current = false;
      keys.release();
    }
  };

  return (
    <g
      className={down ? 'key down' : 'key'}
      transform={`translate(${x} ${y})`}
      role="button"
      aria-label={letter}
      aria-pressed={down}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
    >
      <circle className="key-rim" r={keyRadius + 3} />
      <circle className="key-cap" r={keyRadius} />
      <text className="key-letter" dy="0.35em">
        {letter}
      </text>
    </g>
  );
}
