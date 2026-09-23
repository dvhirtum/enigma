export const lampRadius = 22;

export function Lamp({ letter, lit, x, y }: { letter: string; lit: boolean; x: number; y: number }) {
  return (
    <g
      className={lit ? 'lamp lit' : 'lamp'}
      transform={`translate(${x} ${y})`}
      role="img"
      aria-label={lit ? `Lamp ${letter}, lit` : `Lamp ${letter}`}
    >
      <circle className="lamp-rim" r={lampRadius + 3} />
      <circle className="lamp-glass" r={lampRadius} />
      <text className="lamp-letter" dy="0.35em">
        {letter}
      </text>
    </g>
  );
}
