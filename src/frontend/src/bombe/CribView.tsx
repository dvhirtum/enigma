import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import type { Placement } from '../api';
import { useActive } from '../mode';
import { useMachine } from '../store';
import { isFormControl } from '../useKeys';

/** Keeps the letters of typed text, in capitals. */
export function cribLetters(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

function CribForm() {
  const crib = useMachine((store) => store.bombe?.crib ?? '');
  const setCrib = useMachine((store) => store.setCrib);
  const [text, setText] = useState(crib);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void setCrib(text);
  };

  return (
    <form className="crib-form" onSubmit={onSubmit}>
      <label>
        Crib
        <input value={text} spellCheck={false} autoComplete="off" onChange={(event) => setText(cribLetters(event.target.value))} />
      </label>
      <button type="submit" disabled={text === crib}>
        Set crib
      </button>
    </form>
  );
}

function crashText(crashes: number): string {
  return crashes === 0 ? 'no crashes' : crashes === 1 ? '1 crash' : `${crashes} crashes`;
}

/** The cipher letter under a pointer, counted in letter widths from the first (fractional, so 2.5 is halfway along the third). */
function letterAt(row: HTMLElement | null, clientX: number): number | null {
  const first = row?.firstElementChild?.getBoundingClientRect();
  return first && first.width > 0 ? (clientX - first.left) / first.width : null;
}

/**
 * The cipher text with the crib under it. Drag the crib, or use the arrow keys anywhere outside a text field, to slide
 * it; placing it builds the menu.
 */
function CribStrip({ cipherText, crib, placements, placed }: { cipherText: string; crib: string; placements: Placement[]; placed: number | null }) {
  const placeCrib = useMachine((store) => store.placeCrib);
  const [position, setPosition] = useState(placed ?? 0);
  /** While dragging: which crib letter the pointer holds, in letter widths from the crib start. */
  const grip = useRef<number | null>(null);
  const cipherRow = useRef<HTMLDivElement>(null);
  const cribRow = useRef<HTMLDivElement>(null);
  const last = placements.length - 1;
  const crashes = placements[position]?.crashes ?? [];

  const active = useActive();

  useEffect(() => {
    if (grip.current === null) {
      cribRow.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [position]);

  const slideTo = (next: number) => setPosition(Math.min(last, Math.max(0, next)));

  useEffect(() => {
    if (!active) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.altKey || event.metaKey || isFormControl(event.target)) {
        return;
      }
      const step = { ArrowLeft: (at: number) => at - 1, ArrowRight: (at: number) => at + 1, Home: () => 0, End: () => last }[event.key];
      if (!step) {
        return;
      }
      event.preventDefault();
      setPosition((at) => Math.min(last, Math.max(0, step(at))));
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, last]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const letter = letterAt(cipherRow.current, event.clientX);
    if (letter === null) {
      return;
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
    grip.current = letter - position;
  };

  const onPointerMove = (event: PointerEvent) => {
    const letter = letterAt(cipherRow.current, event.clientX);
    if (grip.current === null || letter === null) {
      return;
    }
    slideTo(Math.round(letter - grip.current));
  };

  const onPointerUp = () => {
    grip.current = null;
  };

  const covered = (index: number) => index >= position && index < position + crib.length;

  return (
    <>
      <div
        className="crib-strip"
        role="slider"
        tabIndex={0}
        aria-label="Crib position"
        aria-valuemin={1}
        aria-valuemax={last + 1}
        aria-valuenow={position + 1}
        aria-valuetext={`Position ${position + 1}, ${crashText(crashes.length)}`}
      >
        <div className="crib-ruler" aria-hidden="true">
          {[...cipherText].map((_, index) => (
            <span key={index}>{index === 0 || (index + 1) % 5 === 0 ? index + 1 : ''}</span>
          ))}
        </div>
        <div className="crib-cipher" ref={cipherRow} aria-hidden="true">
          {[...cipherText].map((letter, index) => (
            <span key={index} className={covered(index) ? (crashes.includes(index - position) ? 'crash' : 'covered') : undefined}>
              {letter}
            </span>
          ))}
        </div>
        <div
          className="crib-letters"
          ref={cribRow}
          aria-hidden="true"
          style={{ marginLeft: `calc(${position} * var(--cell))` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {[...crib].map((letter, index) => (
            <span key={index} className={crashes.includes(index) ? 'crash' : undefined}>
              {letter}
            </span>
          ))}
        </div>
      </div>
      <div className="crib-controls">
        <button type="button" aria-label="Slide left" disabled={position === 0} onClick={() => slideTo(position - 1)}>
          ◀
        </button>
        <button type="button" aria-label="Slide right" disabled={position === last} onClick={() => slideTo(position + 1)}>
          ▶
        </button>
        <p className="summary" aria-live="polite">
          Position {position + 1} of {last + 1} · {crashText(crashes.length)}
        </p>
        <button type="button" disabled={crashes.length > 0 || position === placed} onClick={() => void placeCrib(position)}>
          Place crib
        </button>
        <p className="summary" aria-label="Placed">
          {placed === null ? 'Not placed' : `Placed at position ${placed + 1}`}
        </p>
      </div>
    </>
  );
}

/** Slides the crib along the cipher text to a position without crashes and places it there. */
export function CribView() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe?.source) {
    return <p className="bombe-empty">Load a message in the Message view first.</p>;
  }

  const { cipherText, crib, placements, position } = bombe;
  return (
    <div className="bombe-view">
      <CribForm key={crib ?? ''} />
      {!crib ? (
        <p className="bombe-empty">Type the plain text you expect somewhere in the message.</p>
      ) : placements.length === 0 ? (
        <p className="bombe-empty">The crib is longer than the cipher text.</p>
      ) : (
        <CribStrip key={`${cipherText} ${crib}`} cipherText={cipherText} crib={crib} placements={placements} placed={position} />
      )}
    </div>
  );
}
