import type { KeyboardEvent } from 'react';
import { greekRotors, shiftLetter } from '../machine';
import { useWheelTurn } from './useWheelTurn';

export const drumWidth = 92;
export const drumRadius = 66;

const ratchetWidth = 12;
const ringWidth = 40;
/** Letters on the visible half of the ring, from 6 below the front letter to 6 above it. */
const letterOffsets = Array.from({ length: 13 }, (_, index) => index - 6);
const step = (2 * Math.PI) / 26;
const ringY = (offset: number) => -drumRadius * Math.sin(offset * step);

/** The visible ratchet teeth along the left edge of the drum, from top to bottom. */
const ratchetPath = [
  `M ${ratchetWidth} ${-drumRadius} L 2 ${-drumRadius}`,
  ...[...letterOffsets].reverse().map((offset) => `L 2 ${ringY(offset)} L -4 ${ringY(offset - 0.5)}`),
  `L 2 ${drumRadius} L ${ratchetWidth} ${drumRadius} Z`,
].join(' ');

interface RotorDrumProps {
  /** The letter at the front of the alphabet ring. */
  letter: string;
  name: string;
  label: string;
  valueText: string;
  className?: string;
  /** Draws the fixed mark on the core that the ring setting is read against. */
  ringMark?: boolean;
  x: number;
  y: number;
  scale?: number;
  onTurn: (steps: number) => void;
  onActivate: () => void;
}

/**
 * A rotor seen from the front: ratchet, alphabet ring and wiring core. The framed letter is the one at the front.
 * The mouse wheel and Arrow Up/Down turn it; a click, Enter or Space activates it.
 */
export function RotorDrum({ letter, name, label, valueText, className, ringMark, x, y, scale = 1, onTurn, onActivate }: RotorDrumProps) {
  const wheel = useWheelTurn<SVGGElement>(onTurn, false);

  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined) {
      event.preventDefault();
      onTurn(steps);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onActivate();
    }
  };

  const ringX = ratchetWidth;
  const coreX = ratchetWidth + ringWidth;

  return (
    <g
      ref={wheel}
      className={['rotor-drum', className].filter(Boolean).join(' ')}
      transform={`translate(${x} ${y}) scale(${scale})`}
      role="spinbutton"
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={26}
      aria-valuenow={letter.charCodeAt(0) - 64}
      aria-valuetext={valueText}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onClick={onActivate}
    >
      <rect className="drum-outline" x={-8} y={-drumRadius - 6} width={drumWidth + 16} height={drumRadius * 2 + 12} rx={10} />
      <rect className="drum-core" x={coreX - 4} y={-drumRadius + 6} width={drumWidth - coreX + 4} height={drumRadius * 2 - 12} rx={6} />
      <text className={greekRotors.includes(name) ? 'drum-core-name greek' : 'drum-core-name'} x={coreX + (drumWidth - coreX) / 2} y={ringMark ? 36 : 0} dy="0.35em">
        {name}
      </text>
      {ringMark && (
        <path className="ring-mark" d={`M ${coreX} 0 L ${coreX + 18} -11 L ${coreX + 18} 11 Z`} />
      )}
      <path className="drum-ratchet" d={ratchetPath} />
      <rect className="drum-alphabet" x={ringX} y={-drumRadius} width={ringWidth} height={drumRadius * 2} rx={3} />
      <rect className="drum-front" x={ringX + 3} y={-12} width={ringWidth - 6} height={24} rx={3} />
      {letterOffsets.map((offset) => {
        const depth = Math.cos(offset * step);
        return (
          <text
            key={offset}
            className={offset === 0 ? 'drum-letter front' : 'drum-letter'}
            transform={`translate(${ringX + ringWidth / 2} ${ringY(offset)}) scale(1 ${depth})`}
            opacity={0.35 + 0.65 * depth}
            dy="0.35em"
          >
            {shiftLetter(letter, offset)}
          </text>
        );
      })}
    </g>
  );
}
