import { useState, type FormEvent } from 'react';
import type { BombeSource } from '../api';
import { useMachine } from '../store';

const kinds: Record<BombeSource['kind'], string> = { Intercept: 'Historical intercept', Exercise: 'Exercise', Pasted: 'Pasted' };

/** The cipher text in groups of five. */
export function groups(text: string): string {
  return text.match(/.{1,5}/g)?.join(' ') ?? '';
}

function InterceptPicker() {
  const intercepts = useMachine((store) => store.intercepts);
  const loadIntercept = useMachine((store) => store.loadIntercept);
  const [id, setId] = useState('');
  const chosen = id || intercepts[0]?.id;

  return (
    <div className="bombe-source">
      <label>
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
      <button type="button" disabled={!chosen} onClick={() => chosen && void loadIntercept(chosen)}>
        Load intercept
      </button>
    </div>
  );
}

function PasteForm() {
  const pasteCipherText = useMachine((store) => store.pasteCipherText);
  const [text, setText] = useState('');

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void pasteCipherText(text);
  };

  return (
    <form className="bombe-paste" onSubmit={onSubmit}>
      <label>
        Radio message or cipher text
        <textarea value={text} rows={4} spellCheck={false} onChange={(event) => setText(event.target.value)} />
      </label>
      <button type="submit">Load pasted text</button>
    </form>
  );
}

function LoadedMessage() {
  const source = useMachine((store) => store.bombe?.source);
  const cipherText = useMachine((store) => store.bombe?.cipherText ?? '');
  if (!source) {
    return <p className="bombe-empty">No message loaded. Load an intercept, a new exercise or pasted text.</p>;
  }

  return (
    <section className="bombe-message" aria-label="Loaded message">
      <h2>{source.title}</h2>
      <p className="summary">{kinds[source.kind]}</p>
      {source.hint && <p className="bombe-hint">{source.hint}</p>}
      <h3>As received</h3>
      <pre aria-label="Transcript">{source.transcript}</pre>
      <h3>Cipher text ({cipherText.length} letters)</h3>
      <pre aria-label="Cipher text">{groups(cipherText)}</pre>
    </section>
  );
}

/** Loads the message to break: a historical intercept, a new exercise or pasted text. */
export function MessageView() {
  const generateExercise = useMachine((store) => store.generateExercise);

  return (
    <div className="bombe-view">
      <div className="bombe-sources">
        <InterceptPicker />
        <div className="bombe-source">
          <button type="button" onClick={() => void generateExercise()}>
            New exercise
          </button>
        </div>
        <PasteForm />
      </div>
      <LoadedMessage />
    </div>
  );
}
