import { useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';

const pressKeys = ['Enter', ' '];

/** Calls `onPress` on Enter or Space. */
function onPressKeys(onPress: () => void) {
  return (event: KeyboardEvent) => {
    if (pressKeys.includes(event.key)) {
      event.preventDefault();
      onPress();
    }
  };
}

interface PushButtonProps {
  label: string;
  x: number;
  y: number;
  /** The colour of the cap: start, stop or continue. */
  kind: string;
  disabled: boolean;
  onPress: () => void;
}

/** A round push button with its name engraved under it. */
export function PushButton({ label, x, y, kind, disabled, onPress }: PushButtonProps) {
  return (
    <g
      className={`push-button ${kind}`}
      role="button"
      tabIndex={disabled ? undefined : 0}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onPress}
      onKeyDown={disabled ? undefined : onPressKeys(onPress)}
    >
      <circle className="bezel" cx={x} cy={y} r={15} />
      <circle className="cap" cx={x} cy={y} r={10} />
      <text className="engraving" x={x} y={y + 26}>
        {label.toUpperCase()}
      </text>
    </g>
  );
}

interface ToggleSwitchProps {
  label: string;
  /** The engraving under the switch, when it differs from the label. */
  caption?: string;
  x: number;
  y: number;
  on: boolean;
  disabled: boolean;
  onToggle: (on: boolean) => void;
}

/** A toggle switch: the lever up for on, down for off. */
export function ToggleSwitch({ label, caption = label, x, y, on, disabled, onToggle }: ToggleSwitchProps) {
  const toggle = () => onToggle(!on);
  return (
    <g
      className={on ? 'toggle-switch on' : 'toggle-switch'}
      role="switch"
      tabIndex={disabled ? undefined : 0}
      aria-label={label}
      aria-checked={on}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : toggle}
      onKeyDown={disabled ? undefined : onPressKeys(toggle)}
    >
      <rect className="switch-plate" x={x - 14} y={y - 20} width={28} height={40} rx={3} />
      <text className="engraving small" x={x + 24} y={y - 12} textAnchor="start">
        ON
      </text>
      <text className="engraving small" x={x + 24} y={y + 12} textAnchor="start">
        OFF
      </text>
      <circle className="switch-nut" cx={x} cy={y} r={7} />
      <line className="switch-lever" x1={x} y1={y} x2={x} y2={on ? y - 16 : y + 16} />
      <circle className="switch-tip" cx={x} cy={on ? y - 16 : y + 16} r={3.5} />
      <text className="engraving" x={x} y={y + 34}>
        {caption.toUpperCase()}
      </text>
    </g>
  );
}

interface SelectorProps {
  label: string;
  x: number;
  y: number;
  options: readonly string[];
  value: string;
  disabled: boolean;
  onSelect: (value: string) => void;
}

/** The angle of each of `count` selector positions, spread over the top of the dial. */
const selectorAngle = (index: number, count: number) => (count === 1 ? 0 : -45 + (90 * index) / (count - 1));

/** A rotary selector switch: a pointer knob that clicks round to one of its engraved positions. */
export function Selector({ label, x, y, options, value, disabled, onSelect }: SelectorProps) {
  const angle = selectorAngle(Math.max(0, options.indexOf(value)), options.length);
  return (
    <g className="selector" role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const radians = (selectorAngle(index, options.length) * Math.PI) / 180;
        const select = () => onSelect(option);
        return (
          <g
            key={option}
            className={option === value ? 'selector-position selected' : 'selector-position'}
            role="radio"
            tabIndex={disabled ? undefined : 0}
            aria-label={option}
            aria-checked={option === value}
            aria-disabled={disabled || undefined}
            onClick={disabled ? undefined : select}
            onKeyDown={disabled ? undefined : onPressKeys(select)}
          >
            <circle className="selector-hit" cx={x + 30 * Math.sin(radians)} cy={y - 30 * Math.cos(radians)} r={10} />
            <text className="engraving" x={x + 30 * Math.sin(radians)} y={y - 30 * Math.cos(radians)}>
              {option}
            </text>
          </g>
        );
      })}
      <g transform={`rotate(${angle} ${x} ${y})`} aria-hidden="true">
        <circle className="knob" cx={x} cy={y} r={14} />
        <path className="knob-pointer" d={`M ${x} ${y - 18} L ${x - 4} ${y - 8} L ${x + 4} ${y - 8} Z`} />
      </g>
      <text className="engraving" x={x} y={y + 28}>
        {label.toUpperCase()}
      </text>
    </g>
  );
}

interface KnobProps {
  label: string;
  x: number;
  y: number;
  max: number;
  value: number;
  valueText: (value: number) => string;
  /** The value while it is being set, before it is chosen. */
  onDraft: (value: number) => void;
  /** Chooses the value: at the end of a drag or a key press. */
  onCommit: () => void;
  children?: ReactNode;
}

/** The knob's sweep: 0 at -135 degrees, `max` at +135. */
const sweep = 270;

/** A knob turned by dragging round it, or by the arrow keys, from 0 up to `max`. */
export function Knob({ label, x, y, max, value, valueText, onDraft, onCommit, children }: KnobProps) {
  const dragging = useRef<number | null>(null);
  const [grabbed, setGrabbed] = useState(false);
  const angle = -sweep / 2 + (sweep * value) / max;

  const valueAt = (event: PointerEvent<SVGGElement>) => {
    const matrix = event.currentTarget.ownerSVGElement?.getScreenCTM();
    if (!matrix) {
      return value;
    }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    const pointer = (Math.atan2(point.x - x, y - point.y) * 180) / Math.PI;
    return Math.round(((Math.min(sweep / 2, Math.max(-sweep / 2, pointer)) + sweep / 2) / sweep) * max);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const next = { ArrowUp: value + 1, ArrowRight: value + 1, ArrowDown: value - 1, ArrowLeft: value - 1, PageUp: value + 5, PageDown: value - 5, Home: 0, End: max }[event.key];
    if (next !== undefined) {
      event.preventDefault();
      onDraft(Math.min(max, Math.max(0, next)));
    }
  };

  return (
    <g
      className={grabbed ? 'knob-control grabbed' : 'knob-control'}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText(value)}
      onKeyDown={onKeyDown}
      onKeyUp={onCommit}
      onBlur={onCommit}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragging.current = event.pointerId;
        setGrabbed(true);
        onDraft(valueAt(event));
      }}
      onPointerMove={(event) => dragging.current === event.pointerId && onDraft(valueAt(event))}
      onPointerUp={() => {
        dragging.current = null;
        setGrabbed(false);
        onCommit();
      }}
    >
      {Array.from({ length: 11 }, (_, tick) => (
        <line
          key={tick}
          className="knob-tick"
          x1={x}
          y1={y - 24}
          x2={x}
          y2={y - 20}
          transform={`rotate(${-sweep / 2 + (sweep * tick) / 10} ${x} ${y})`}
          aria-hidden="true"
        />
      ))}
      <g transform={`rotate(${angle} ${x} ${y})`} aria-hidden="true">
        <circle className="knob" cx={x} cy={y} r={17} />
        <line className="knob-mark" x1={x} y1={y - 15} x2={x} y2={y - 6} />
      </g>
      <text className="engraving" x={x} y={y + 32}>
        {label.toUpperCase()}
      </text>
      {children}
    </g>
  );
}

interface LetterDialProps {
  label: string;
  x: number;
  y: number;
  letter: string;
  disabled: boolean;
  onTurn: (steps: number) => void;
}

/** A letter in a small window with a click-stop arrow above and below it, set by click or Arrow Up/Down. */
export function LetterDial({ label, x, y, letter, disabled, onTurn }: LetterDialProps) {
  const onKeyDown = (event: KeyboardEvent) => {
    const steps = { ArrowUp: 1, ArrowDown: -1 }[event.key];
    if (steps !== undefined) {
      event.preventDefault();
      onTurn(steps);
    }
  };
  return (
    <g
      className="letter-dial"
      role="spinbutton"
      tabIndex={disabled ? undefined : 0}
      aria-label={label}
      aria-valuetext={letter}
      aria-disabled={disabled || undefined}
      onKeyDown={disabled ? undefined : onKeyDown}
    >
      <path className="dial-arrow" d={`M ${x - 7} ${y - 16} L ${x} ${y - 24} L ${x + 7} ${y - 16} Z`} onClick={disabled ? undefined : () => onTurn(1)} />
      <rect className="dial-window" x={x - 12} y={y - 12} width={24} height={24} rx={3} />
      <text className="dial-letter" x={x} y={y}>
        {letter}
      </text>
      <path className="dial-arrow" d={`M ${x - 7} ${y + 16} L ${x} ${y + 24} L ${x + 7} ${y + 16} Z`} onClick={disabled ? undefined : () => onTurn(-1)} />
    </g>
  );
}
