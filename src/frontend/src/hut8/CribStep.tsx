import { useEffect, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import type { Placement } from '../api';
import { useMachine } from '../store';
import { isFormControl } from '../useKeys';
import { cribLetters, plural } from './letters';

function CribForm() {
  const crib = useMachine((store) => store.bombe?.crib ?? '');
  const setCrib = useMachine((store) => store.setCrib);
  const [text, setText] = useState(crib);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void setCrib(text);
  };

  return (
    <form className="notebook-form" aria-label="Crib" onSubmit={onSubmit}>
      <label className="inline-label">
        Crib
        <input
          className="hand-input crib-input"
          value={text}
          spellCheck={false}
          autoComplete="off"
          placeholder="WETTERVORHERSAGE"
          onChange={(event) => setText(cribLetters(event.target.value))}
        />
      </label>
      <p className="notebook-actions">
        <button type="submit" disabled={text === crib}>
          Set crib
        </button>
      </p>
    </form>
  );
}

function crashText(crashes: number): string {
  return crashes === 0 ? 'no crashes' : plural(crashes, 'crash', 'crashes');
}

/** The cipher letter under a pointer, counted in letter widths from the first (fractional, so 2.5 is halfway along the third). */
function letterAt(row: HTMLElement | null, clientX: number): number | null {
  const first = row?.firstElementChild?.getBoundingClientRect();
  return first && first.width > 0 ? (clientX - first.left) / first.width : null;
}

/**
 * The cipher text written out in squares with the crib under it. Drag the crib, or use the arrow keys anywhere outside a
 * text field, to slide it; a crash (a letter enciphered to itself) is crossed out in red.
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

  useEffect(() => {
    if (grip.current === null) {
      cribRow.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }
  }, [position]);

  const slideTo = (next: number) => setPosition(Math.min(last, Math.max(0, next)));

  useEffect(() => {
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
  }, [last]);

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
        className="crib-paper"
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
            <span key={index} className={covered(index) ? (crashes.includes(index - position) ? 'square crash' : 'square covered') : 'square'}>
              {letter}
            </span>
          ))}
        </div>
        <div
          className="crib-letters"
          ref={cribRow}
          aria-hidden="true"
          style={{ marginLeft: `calc(${position} * var(--sq))` }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {[...crib].map((letter, index) => (
            <span key={index} className={crashes.includes(index) ? 'square crash' : 'square'}>
              {letter}
            </span>
          ))}
        </div>
      </div>
      <p className="notebook-actions">
        <button type="button" aria-label="Slide left" disabled={position === 0} onClick={() => slideTo(position - 1)}>
          ◀
        </button>
        <button type="button" aria-label="Slide right" disabled={position === last} onClick={() => slideTo(position + 1)}>
          ▶
        </button>
        <span className="hut8-note" aria-live="polite">
          Position {position + 1} of {last + 1} · {crashText(crashes.length)}
        </span>
      </p>
      <p className="notebook-actions">
        <button type="button" disabled={crashes.length > 0 || position === placed} onClick={() => void placeCrib(position)}>
          Place crib
        </button>
      </p>
    </>
  );
}

/** Where the crib was placed: the cipher letters it covers, with the crib written under them. */
export function CribSummary() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe?.crib || bombe.position === null) {
    return null;
  }

  const { crib, position, cipherText } = bombe;
  const cipher = cipherText.slice(position, position + crib.length);
  return (
    <section className="notebook-section" aria-label="Placed crib">
      <p>Placed at position {position + 1}, no crashes.</p>
      <p className="keys-lamps crib-placed" role="group" aria-label="Crib under the cipher text">
        <span className="keys-lamps-group">
          <span className="keys-lamps-row">
            {[...cipher].map((letter, index) => (
              <span key={index} className="square">
                {letter}
              </span>
            ))}
          </span>
          <span className="keys-lamps-row keys-lamps-lamp">
            {[...crib].map((letter, index) => (
              <span key={index} className="square">
                {letter}
              </span>
            ))}
          </span>
        </span>
      </p>
    </section>
  );
}

/** Slides the crib along the cipher text to a position without crashes and places it there. */
export function CribStep() {
  const bombe = useMachine((store) => store.bombe);
  if (!bombe) {
    return null;
  }

  const { cipherText, crib, placements, position } = bombe;
  return (
    <>
      <p>Write down the plain text you expect somewhere in the message, then slide it along the cipher text to a place where no letter crashes.</p>
      <CribForm key={crib ?? ''} />
      {crib && placements.length === 0 && <p className="notebook-warning">The crib is longer than the cipher text.</p>}
      {crib && placements.length > 0 && <CribStrip key={`${cipherText} ${crib}`} cipherText={cipherText} crib={crib} placements={placements} placed={position} />}
    </>
  );
}
