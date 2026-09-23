import type { KeyboardEvent } from 'react';
import { alphabet } from '../machine';
import { useWheelTurn } from './useWheelTurn';

interface RotorWindowProps {
  slot: string;
  position: string | null;
  x: number;
  y: number;
  onTurn: (steps: number) => void;
}

export const windowWidth = 40;
export const windowHeight = 48;

/** The window in the lid that shows a rotor's letter. Arrow Up/Down and the mouse wheel turn the rotor. */
export function RotorWindow({ slot, position, x, y, onTurn }: RotorWindowProps) {
  const empty = position === null;
  const wheel = useWheelTurn<SVGGElement>(onTurn, empty);

  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined && !empty) {
      event.preventDefault();
      onTurn(steps);
    }
  };

  return (
    <g
      ref={wheel}
      className="rotor-window"
      transform={`translate(${x} ${y})`}
      role="spinbutton"
      aria-label={`${slot} rotor`}
      aria-valuemin={1}
      aria-valuemax={26}
      aria-valuenow={empty ? undefined : alphabet.indexOf(position) + 1}
      aria-valuetext={empty ? 'empty' : position}
      aria-disabled={empty}
      tabIndex={empty ? -1 : 0}
      onKeyDown={onKeyDown}
    >
      <rect className="rotor-window-frame" x={-windowWidth / 2 - 5} y={-windowHeight / 2 - 5} width={windowWidth + 10} height={windowHeight + 10} rx={8} />
      <rect className="rotor-window-glass" x={-windowWidth / 2} y={-windowHeight / 2} width={windowWidth} height={windowHeight} rx={5} />
      {!empty && (
        <text className="rotor-window-letter" dy="0.35em">
          {position}
        </text>
      )}
    </g>
  );
}
