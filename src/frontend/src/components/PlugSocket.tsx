import type { KeyboardEvent, PointerEvent } from 'react';

export const socketRadius = 16;
export const plugHeight = 28;

interface PlugSocketProps {
  letter: string;
  /** The letter at the other end of the cable plugged in here. */
  partner: string | null;
  /** Whether the plug is drawn in the socket. It is hidden while its end is dragged. */
  plugged: boolean;
  selected: boolean;
  x: number;
  y: number;
  onActivate: (letter: string) => void;
  onGrab: (letter: string, event: PointerEvent<SVGGElement>) => void;
}

/** A plugboard socket. Enter or Space picks it as a cable end, or removes the cable plugged into it. */
export function PlugSocket({ letter, partner, plugged, selected, x, y, onActivate, onGrab }: PlugSocketProps) {
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate(letter);
    }
  };

  return (
    <g
      className={selected ? 'socket selected' : 'socket'}
      transform={`translate(${x} ${y})`}
      role="button"
      tabIndex={0}
      aria-label={partner ? `Socket ${letter}, plugged to ${partner}` : `Socket ${letter}`}
      aria-pressed={selected}
      data-socket={letter}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => onGrab(letter, event)}
    >
      <text className="socket-letter" y={-socketRadius - 10}>
        {letter}
      </text>
      <circle className="socket-plate" r={socketRadius} />
      <circle className="socket-hole" cx={-5} r={3} />
      <circle className="socket-hole" cx={5} r={4.5} />
      {plugged && <rect className="plug" x={-10} y={-plugHeight / 2} width={20} height={plugHeight} rx={4} />}
    </g>
  );
}
