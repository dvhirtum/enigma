import { useState, type FormEvent } from 'react';
import type { BombeSource } from '../api';
import { Hand, Squares } from '../notebook/paper';
import { useMachine } from '../store';
import { groups, plural } from './letters';

const kinds: Record<BombeSource['kind'], string> = { Intercept: 'Historical intercept', Exercise: 'Exercise', Pasted: 'Pasted' };

function InterceptPicker({ onLoaded }: { onLoaded: () => void }) {
  const intercepts = useMachine((store) => store.intercepts);
  const loadIntercept = useMachine((store) => store.loadIntercept);
  const [id, setId] = useState('');
  const chosen = id || intercepts[0]?.id;

  return (
    <p className="notebook-actions">
      <label className="inline-label">
        Intercept
        <select value={chosen ?? ''} onChange={(event) => setId(event.target.value)} disabled={intercepts.length === 0}>
          {intercepts.map((intercept) => (
            <option key={intercept.id} value={intercept.id}>
              {intercept.title}
              {intercept.date && ` (${intercept.date})`}
            </option>
          ))}
        </select>
      </label>
      <button type="button" disabled={!chosen} onClick={() => chosen && void loadIntercept(chosen).then((loaded) => loaded && onLoaded())}>
        Load intercept
      </button>
    </p>
  );
}

function PasteForm({ onLoaded }: { onLoaded: () => void }) {
  const pasteCipherText = useMachine((store) => store.pasteCipherText);
  const [text, setText] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void pasteCipherText(text).then((loaded) => loaded && onLoaded());
  };

  return (
    <form className="notebook-form" aria-label="Paste a message" onSubmit={onSubmit}>
      <label>
        Radio message or cipher text
        <textarea
          className="hand-input"
          value={text}
          rows={3}
          spellCheck={false}
          placeholder="1840 = 24 = QWER TZUI ABCDE FGHIJ"
          onChange={(event) => setText(event.target.value)}
        />
      </label>
      <p className="notebook-actions">
        <button type="submit" disabled={text.trim() === ''}>
          Load pasted text
        </button>
      </p>
    </form>
  );
}

/** The message as it was received, and its cipher text in groups of four. */
export function MessageSummary() {
  const source = useMachine((store) => store.bombe?.source);
  const cipherText = useMachine((store) => store.bombe?.cipherText ?? '');
  if (!source) {
    return null;
  }

  return (
    <section className="notebook-section" aria-label="Loaded message">
      <p>
        <Hand>{source.title}</Hand> · {kinds[source.kind]} · {plural(cipherText.length, 'letter')}
      </p>
      {source.hint && <p className="hut8-hint">{source.hint}</p>}
      <Squares text={groups(cipherText)} label="Cipher text" />
    </section>
  );
}

/** Loads the message to break: a historical intercept, a new exercise or pasted text. `onDone` follows a load. */
export function MessageStep({ onDone }: { onDone: () => void }) {
  const generateExercise = useMachine((store) => store.generateExercise);

  return (
    <>
      <p>Take a message from the day's traffic: a historical intercept, an exercise made from a key sheet, or a message of your own.</p>
      <InterceptPicker onLoaded={onDone} />
      <p className="notebook-actions">
        <button type="button" onClick={() => void generateExercise().then((loaded) => loaded && onDone())}>
          New exercise
        </button>
      </p>
      <PasteForm onLoaded={onDone} />
    </>
  );
}
