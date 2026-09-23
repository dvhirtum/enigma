import type { WheelEvent } from 'react';

interface ThumbwheelProps {
  slot: string;
  disabled: boolean;
  x: number;
  y: number;
  onTurn: (steps: number) => void;
}

const width = 18;
const height = 64;
const ribs = Array.from({ length: 11 }, (_, index) => -height / 2 + 6 + index * ((height - 12) / 10));

/** The ribbed wheel next to a rotor window. The top half turns the rotor up, the bottom half down. */
export function Thumbwheel({ slot, disabled, x, y, onTurn }: ThumbwheelProps) {
  const onWheel = (event: WheelEvent) => {
    if (event.deltaY !== 0 && !disabled) {
      onTurn(event.deltaY < 0 ? 1 : -1);
    }
  };

  const half = (label: string, steps: number, top: number) => (
    <g
      className="thumbwheel-half"
      role="button"
      aria-label={`Turn ${slot} rotor ${label}`}
      aria-disabled={disabled}
      onClick={() => !disabled && onTurn(steps)}
    >
      <rect x={-width / 2} y={top} width={width} height={height / 2} />
    </g>
  );

  return (
    <g className={disabled ? 'thumbwheel disabled' : 'thumbwheel'} transform={`translate(${x} ${y})`} onWheel={onWheel}>
      <rect className="thumbwheel-body" x={-width / 2} y={-height / 2} width={width} height={height} rx={7} />
      {ribs.map((ribY) => (
        <line key={ribY} className="thumbwheel-rib" x1={-width / 2 + 2} x2={width / 2 - 2} y1={ribY} y2={ribY} />
      ))}
      <path className="thumbwheel-arrow" d={`M -5 ${-height / 2 - 6} L 0 ${-height / 2 - 12} L 5 ${-height / 2 - 6} Z`} />
      <path className="thumbwheel-arrow" d={`M -5 ${height / 2 + 6} L 0 ${height / 2 + 12} L 5 ${height / 2 + 6} Z`} />
      {half('up', 1, -height / 2)}
      {half('down', -1, 0)}
    </g>
  );
}
