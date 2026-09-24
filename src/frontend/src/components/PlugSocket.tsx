import type { KeyboardEvent, PointerEvent } from 'react';

/** Vertical distance from the letter to the upper hole, and between the two holes. */
export const holeTop = 22;
export const holeGap = 26;
export const plugWidth = 24;
export const plugHeight = 44;

/** A bakelite plug over both holes of a socket, centred on (x, y). */
export function Plug({ x, y }: { x: number; y: number }) {
  return (
    <g className="plug" transform={`translate(${x} ${y})`}>
      <rect className="plug-body" x={-plugWidth / 2} y={-plugHeight / 2} width={plugWidth} height={plugHeight} rx={9} />
      <circle className="plug-screw" r={4.5} />
      <line className="plug-screw-slot" x1={-3.5} y1={-1} x2={3.5} y2={1} />
    </g>
  );
}

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

/**
 * A plugboard socket: the letter above two holes. Enter or Space picks it as a cable end,
 * or removes the cable plugged into it.
 */
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
      <rect className="socket-area" x={-15} y={-12} width={30} height={holeTop + holeGap + 24} />
      <text className="socket-letter" dy="0.35em">
        {letter}
      </text>
      {[
        { holeY: holeTop, ring: 9, hole: 5 },
        { holeY: holeTop + holeGap, ring: 8, hole: 4 },
      ].map(({ holeY, ring, hole }) => (
        <g key={holeY} transform={`translate(0 ${holeY})`}>
          <circle className="socket-ring" r={ring} />
          <circle className="socket-hole" r={hole} />
        </g>
      ))}
      {plugged && <Plug x={0} y={holeTop + holeGap / 2} />}
    </g>
  );
}
