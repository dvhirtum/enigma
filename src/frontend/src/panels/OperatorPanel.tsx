import { useEffect, useState, type FormEvent } from 'react';
import type { AppliedKey, Kenngruppenbuch, OperatorState, OperatorStep, ReceivingKey } from '../api';
import { useMachine } from '../store';

const stepLabels: Record<OperatorStep, string> = {
  ChooseGroups: 'Choose the groups',
  SetGrundstellung: 'Set the Grundstellung',
  TypeVerfahrenkenngruppe: 'Type the Verfahrenkenngruppe',
  SetSpruchschluessel: 'Set the Spruchschlüssel',
  TypeMessage: 'Type the message',
  Done: 'Done',
};

const sendSteps: OperatorStep[] = ['ChooseGroups', 'SetGrundstellung', 'TypeVerfahrenkenngruppe', 'SetSpruchschluessel', 'TypeMessage', 'Done'];
const receiveSteps = sendSteps.slice(1);

const keyboardHint = 'Type on the keyboard in the top-down view.';

/** Splits letters into groups of 4. */
function groups(letters: string): string[] {
  return letters.match(/.{1,4}/g) ?? [];
}

function spaced(letters: string): string {
  return [...letters].join(' ');
}

/** The lamps lit while typing the message, in 4-letter groups. */
function MessagePad({ letters, label }: { letters: string; label: string }) {
  return (
    <section className="pad" aria-label="Message pad">
      <h3>{label}</h3>
      <p className="pad-groups">{letters ? groups(letters).join(' ') : '—'}</p>
    </section>
  );
}

/** The column numbers of `range`. */
function columnsOf(range: { first: number; last: number }): number[] {
  return Array.from({ length: range.last - range.first + 1 }, (_, index) => range.first + index);
}

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

/** Picks one trigram from a range of columns of the Kenngruppenbuch. */
function TrigramPicker({
  label,
  book,
  range,
  value,
  onChange,
}: {
  label: string;
  book: Kenngruppenbuch;
  range: { first: number; last: number };
  value: { column: number; trigram: string | null };
  onChange: (value: { column: number; trigram: string | null }) => void;
}) {
  const trigrams = book.columns[value.column - 1].split(' ');
  return (
    <fieldset className="picker">
      <legend>{label}</legend>
      <label>
        Column
        <select value={value.column} onChange={(event) => onChange({ column: Number(event.target.value), trigram: null })}>
          {columnsOf(range).map((column) => (
            <option key={column}>{column}</option>
          ))}
        </select>
      </label>
      <div className="picker-grid" role="group" aria-label={`${label}, column ${value.column}`}>
        {trigrams.map((trigram) => (
          <button key={trigram} type="button" aria-pressed={value.trigram === trigram} onClick={() => onChange({ column: value.column, trigram })}>
            {trigram}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ChooseGroups({ operator }: { operator: OperatorState }) {
  const book = useMachine((store) => store.books[operator.kenngruppenbuchId]);
  const loadBook = useMachine((store) => store.loadBook);
  const chooseGroups = useMachine((store) => store.chooseGroups);
  const [schluessel, setSchluessel] = useState<{ column: number; trigram: string | null } | null>(null);
  const [verfahren, setVerfahren] = useState<{ column: number; trigram: string | null } | null>(null);
  const [fillers, setFillers] = useState(operator.fillers);

  useEffect(() => {
    void loadBook(operator.kenngruppenbuchId);
  }, [loadBook, operator.kenngruppenbuchId]);

  const allotment = book?.allotments.find((a) => a.network.toLowerCase() === operator.network.toLowerCase());
  if (!book || !allotment) {
    return <p role="status">Opening the Kenngruppenbuch...</p>;
  }

  const netRange = { first: allotment.first, last: allotment.last };
  const pickRandom = (range: { first: number; last: number }) => {
    const column = randomItem(columnsOf(range));
    return { column, trigram: randomItem(book.columns[column - 1].split(' ')) };
  };
  const random = () => {
    setSchluessel(pickRandom(netRange));
    setVerfahren(pickRandom(book.verfahrenkenngruppen));
  };
  const chosen = schluessel?.trigram && verfahren?.trigram && /^[a-z]{2}$/i.test(fillers);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (chosen) {
      void chooseGroups(schluessel.trigram!, verfahren.trigram!, fillers.toUpperCase());
    }
  };

  return (
    <form className="operator-form" aria-label="Choose the groups" onSubmit={submit}>
      <p className="operator-hint">
        Pick a Schlüsselkenngruppe from the columns allotted to {operator.network} ({allotment.first}–{allotment.last}) and a Verfahrenkenngruppe
        from columns {book.verfahrenkenngruppen.first}–{book.verfahrenkenngruppen.last}.
      </p>
      <TrigramPicker label="Schlüsselkenngruppe" book={book} range={netRange} value={schluessel ?? { column: netRange.first, trigram: null }} onChange={setSchluessel} />
      <TrigramPicker
        label="Verfahrenkenngruppe"
        book={book}
        range={book.verfahrenkenngruppen}
        value={verfahren ?? { column: book.verfahrenkenngruppen.first, trigram: null }}
        onChange={setVerfahren}
      />
      <label>
        Fillers (before and after)
        <input value={fillers} maxLength={2} required pattern="[A-Za-z]{2}" onChange={(event) => setFillers(event.target.value)} />
      </label>
      <div className="sheet-actions">
        <button type="button" onClick={random}>
          Random
        </button>
        <button type="submit" disabled={!chosen}>
          Encrypt indicator
        </button>
      </div>
    </form>
  );
}

/** The indicator written out, its bigram swaps and the resulting groups. */
function IndicatorView({ operator }: { operator: OperatorState }) {
  if (!operator.schluesselkenngruppe || !operator.verfahrenkenngruppe) {
    return null;
  }

  const top = operator.fillers[0] + operator.schluesselkenngruppe;
  const bottom = operator.verfahrenkenngruppe + operator.fillers[1];
  return (
    <section className="indicator" aria-label="Indicator">
      <h3>Indicator (Tauschtafel {operator.table})</h3>
      <div className="indicator-rows">
        <span>{spaced(top)}</span>
        <span>{spaced(bottom)}</span>
      </div>
      <p className="indicator-swaps">{operator.bigrams.map((bigram) => `${bigram.from}→${bigram.to}`).join('  ')}</p>
      <p>
        Groups <strong>{operator.indicator}</strong>
      </p>
    </section>
  );
}

function CipherText({ operator }: { operator: OperatorState }) {
  const cipher = operator.cipherText ?? '';
  const typed = operator.pad.length;
  return (
    <p className="cipher" aria-label="Cipher text">
      {[...cipher].map((letter, index) => (
        <span key={index} className={index < typed ? 'cipher-typed' : index === typed ? 'cipher-next' : undefined} aria-current={index === typed ? 'true' : undefined}>
          {letter}
          {index % 4 === 3 && ' '}
        </span>
      ))}
    </p>
  );
}

function CopyButton({ text }: { text: string }) {
  const copyText = useMachine((store) => store.copyText);
  const [copied, setCopied] = useState(false);
  const copy = async () => setCopied(await copyText(text));
  return (
    <button type="button" onClick={() => void copy()}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function StepDetails({ operator }: { operator: OperatorState }) {
  const finishMessage = useMachine((store) => store.finishMessage);
  const sending = operator.direction === 'Send';

  switch (operator.step) {
    case 'ChooseGroups':
      return <ChooseGroups operator={operator} />;
    case 'SetGrundstellung':
      return (
        <p className="operator-hint">
          Set the rotor windows to the Grundstellung <strong>{spaced(operator.grundstellung)}</strong>.
        </p>
      );
    case 'TypeVerfahrenkenngruppe':
      return (
        <p className="operator-hint">
          Type the Verfahrenkenngruppe <strong>{spaced(operator.verfahrenkenngruppe ?? '')}</strong>. Next: <strong>{operator.expectedKey}</strong>.
          Lamps so far: {spaced(operator.spruchschluesselLamps) || '—'}. {keyboardHint}
        </p>
      );
    case 'SetSpruchschluessel':
      return (
        <p className="operator-hint">
          The lamps gave the Spruchschlüssel. Set the rotor windows to <strong>{spaced(operator.spruchschluessel ?? '')}</strong>.
        </p>
      );
    case 'TypeMessage':
      return sending ? (
        <div className="operator-form">
          <p className="operator-hint">Type the plaintext. {keyboardHint}</p>
          {operator.fillersNeeded > 0 && (
            <p className="operator-hint" role="status">
              Type X {operator.fillersNeeded} more time(s) to fill the last group.
            </p>
          )}
          <div className="sheet-actions">
            <button type="button" disabled={operator.pad.length === 0 || operator.fillersNeeded > 0} onClick={() => void finishMessage()}>
              Finish
            </button>
          </div>
        </div>
      ) : (
        <div className="operator-form">
          <p className="operator-hint">
            Type the cipher text. Next: <strong>{operator.expectedKey}</strong>. {keyboardHint}
          </p>
          <CipherText operator={operator} />
        </div>
      );
    case 'Done':
      return sending ? (
        <div className="operator-form">
          <h3>Radio message</h3>
          <output className="radio-message" aria-label="Radio message">
            {operator.message}
          </output>
          <div className="sheet-actions">
            <CopyButton text={operator.message ?? ''} />
          </div>
        </div>
      ) : (
        <p className="operator-hint">The message is decrypted.</p>
      );
  }
}

function Procedure({ operator }: { operator: OperatorState }) {
  const cancelOperator = useMachine((store) => store.cancelOperator);
  const steps = operator.direction === 'Send' ? sendSteps : receiveSteps;
  const sending = operator.direction === 'Send';

  return (
    <div className="operator">
      <p className="sheet-meta">
        {sending ? 'Sending' : 'Receiving'} · {operator.network} · Grundstellung {operator.grundstellung}
      </p>
      <ol className="operator-steps" aria-label="Steps">
        {steps.map((step) => (
          <li key={step} aria-current={step === operator.step ? 'step' : undefined}>
            {stepLabels[step]}
          </li>
        ))}
      </ol>
      {operator.warnings.length > 0 && (
        <ul className="operator-warnings" aria-label="Warnings">
          {operator.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <StepDetails operator={operator} />
      <IndicatorView operator={operator} />
      {operator.spruchschluessel && <p className="sheet-meta">Spruchschlüssel {operator.spruchschluessel}</p>}
      {(operator.step === 'TypeMessage' || operator.step === 'Done') && (
        <MessagePad letters={operator.pad} label={sending ? 'Cipher text' : 'Plaintext'} />
      )}
      <div className="sheet-actions">
        <button type="button" onClick={() => void cancelOperator()}>
          {operator.step === 'Done' ? 'New message' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

/** yyyy-MM-dd of the applied key's day, or of today. */
function initialDate(appliedKey: AppliedKey | null | undefined): string {
  if (appliedKey) {
    return `${appliedKey.month}-${String(appliedKey.day).padStart(2, '0')}`;
  }
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Finds the key sheets whose network the message's Schlüsselkenngruppe is allotted to, and receives with the chosen one. */
function Receive() {
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const findReceivingKeys = useMachine((store) => store.findReceivingKeys);
  const startReceiving = useMachine((store) => store.startReceiving);
  const [message, setMessage] = useState('');
  const [editedDate, setDate] = useState<string | null>(null);
  const date = editedDate ?? initialDate(appliedKey);
  const [keys, setKeys] = useState<ReceivingKey[] | null>(null);

  const find = async (event: FormEvent) => {
    event.preventDefault();
    setKeys(await findReceivingKeys(message, date));
  };

  return (
    <form className="operator-form" aria-label="Receive a message" onSubmit={(event) => void find(event)}>
      <label>
        Received message
        <textarea
          value={message}
          rows={5}
          spellCheck={false}
          placeholder="1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI"
          onChange={(event) => {
            setMessage(event.target.value);
            setKeys(null);
          }}
        />
      </label>
      <label>
        Date
        <input
          type="date"
          value={date}
          required
          onChange={(event) => {
            setDate(event.target.value);
            setKeys(null);
          }}
        />
      </label>
      <div className="sheet-actions">
        <button type="submit" disabled={message.trim() === '' || date === ''}>
          Find key
        </button>
      </div>
      {keys && keys.length === 0 && (
        <p className="operator-hint" role="status">
          No key sheet for {date} fits this message.
        </p>
      )}
      {keys && keys.length > 0 && (
        <ul className="receiving-keys" aria-label="Matching keys">
          {keys.map((key) => (
            <li key={key.sheetId}>
              <span>
                {key.network} {key.month}, day {key.day} · {key.model} · Schlüsselkenngruppe {key.schluesselkenngruppe}
              </span>
              <button type="button" onClick={() => void startReceiving(message, key.sheetId, key.day)}>
                Receive with this key
              </button>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

function Start() {
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const startSending = useMachine((store) => store.startSending);

  return (
    <div className="operator">
      {appliedKey ? (
        <div className="sheet-actions">
          <button type="button" onClick={() => void startSending()}>
            Send a message
          </button>
        </div>
      ) : (
        <p className="operator-hint">Apply a daily key to send. Sending uses its network, Grundstellung, Kenngruppenbuch and Tauschtafel.</p>
      )}
      <Receive />
    </div>
  );
}

/** Walks through the Navy indicator procedure while the operator works the machine. */
export function OperatorPanel() {
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const operator = useMachine((store) => store.machine?.operator);

  return (
    <div className="operator">
      {appliedKey && (
        <p className="sheet-meta">
          Key: {appliedKey.network} {appliedKey.month}, day {appliedKey.day}
        </p>
      )}
      {appliedKey?.modified && (
        <p className="operator-warning" role="status">
          The machine setup differs from the daily key.
        </p>
      )}
      {operator ? <Procedure operator={operator} /> : <Start />}
    </div>
  );
}
