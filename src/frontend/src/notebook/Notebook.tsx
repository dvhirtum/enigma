import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import type { AppliedKey, Kenngruppenbuch, OperatorState, OperatorStep, ReceivingKey } from '../api';
import { useMachine } from '../store';
import { useKeys, usePhysicalKeyboard } from '../useKeys';

type Direction = OperatorState['direction'];

const tabs: { direction: Direction; label: string }[] = [
  { direction: 'Send', label: 'Encrypt' },
  { direction: 'Receive', label: 'Decrypt' },
];

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

const keyboardHint = 'Type on the machine or right here in the notebook.';
const rotorHint = 'Turn the rotors in the machine window.';

/** Splits letters into groups of 4. */
function groups(letters: string): string[] {
  return letters.match(/.{1,4}/g) ?? [];
}

/** Handwriting inside printed text. */
function Hand({ children }: { children: ReactNode }) {
  return <span className="hand">{children}</span>;
}

/**
 * Writes `text` by hand, one character per square. Each space leaves an empty square, and groups do not break across lines.
 * `stacked` writes each group on a line of its own.
 */
function Squares({ text, label, stacked = false }: { text: string; label?: string; stacked?: boolean }) {
  const words = text.split(' ').filter(Boolean);
  return (
    <span className={stacked ? 'squares squares-stacked' : 'squares'} role={label ? 'group' : undefined} aria-label={label}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="squares-group">
          {[...word].map((letter, index) => (
            <span key={index} className="square">
              {letter}
            </span>
          ))}
          {wordIndex < words.length - 1 && <span className="square"> </span>}
        </span>
      ))}
    </span>
  );
}

/** A printed label with handwritten squares after it. */
function Field({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  return (
    <p className="field">
      <span className="field-label">{label}</span>
      <Squares text={value} label={label} stacked={stacked} />
    </p>
  );
}

/** The cipher text in groups of 4, with the plaintext written under each letter as it is typed. */
function Decipherment({ cipher, plain }: { cipher: string; plain: string }) {
  const cells = (from: string, start: number, row: string) =>
    [...from].map((letter, column) => (
      <span key={column} className="square" aria-current={row === 'cipher' && start + column === plain.length ? 'true' : undefined}>
        {letter}
      </span>
    ));
  return (
    <p className="decipherment" role="group" aria-label="Cipher text">
      {groups(cipher).map((group, index) => (
        <span key={index} className="decipherment-group">
          <span className="decipherment-row">{cells(group, index * 4, 'cipher')}</span>
          <span className="decipherment-row decipherment-plain">{cells(plain.slice(index * 4, index * 4 + 4).padEnd(group.length, ' '), index * 4, 'plain')}</span>
        </span>
      ))}
    </p>
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
  const id = useId();
  const trigrams = book.columns[value.column - 1].split(' ');
  return (
    <div className="picker" role="group" aria-labelledby={id}>
      <p className="picker-heading">
        <span id={id}>{label}</span>
        <label>
          Column
          <select value={value.column} onChange={(event) => onChange({ column: Number(event.target.value), trigram: null })}>
            {columnsOf(range).map((column) => (
              <option key={column}>{column}</option>
            ))}
          </select>
        </label>
      </p>
      <div className="picker-grid" role="group" aria-label={`${label}, column ${value.column}`}>
        {trigrams.map((trigram) => (
          <button key={trigram} type="button" aria-pressed={value.trigram === trigram} onClick={() => onChange({ column: value.column, trigram })}>
            {trigram}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Picks the groups while `current`; afterwards writes down the groups chosen and the indicator. */
function ChooseGroups({ operator, current }: { operator: OperatorState; current: boolean }) {
  const book = useMachine((store) => store.books[operator.kenngruppenbuchId]);
  const loadBook = useMachine((store) => store.loadBook);
  const chooseGroups = useMachine((store) => store.chooseGroups);
  const [schluessel, setSchluessel] = useState<{ column: number; trigram: string | null } | null>(null);
  const [verfahren, setVerfahren] = useState<{ column: number; trigram: string | null } | null>(null);
  const [fillers, setFillers] = useState(operator.fillers);

  useEffect(() => {
    void loadBook(operator.kenngruppenbuchId);
  }, [loadBook, operator.kenngruppenbuchId, book]);

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

  const instruction = (
    <p>
      Pick a Schlüsselkenngruppe from the columns allotted to {operator.network} ({allotment.first}–{allotment.last}) and a Verfahrenkenngruppe
      from columns {book.verfahrenkenngruppen.first}–{book.verfahrenkenngruppen.last}.
    </p>
  );

  if (!current) {
    return (
      <>
        {instruction}
        <Field label="Schlüsselkenngruppe" value={operator.schluesselkenngruppe ?? ''} />
        <Field label="Verfahrenkenngruppe" value={operator.verfahrenkenngruppe ?? ''} />
        <Field label="Fillers" value={operator.fillers} />
        <IndicatorView operator={operator} />
      </>
    );
  }

  return (
    <form className="notebook-form" aria-label="Choose the groups" onSubmit={submit}>
      {instruction}
      <TrigramPicker label="Schlüsselkenngruppe" book={book} range={netRange} value={schluessel ?? { column: netRange.first, trigram: null }} onChange={setSchluessel} />
      <TrigramPicker
        label="Verfahrenkenngruppe"
        book={book}
        range={book.verfahrenkenngruppen}
        value={verfahren ?? { column: book.verfahrenkenngruppen.first, trigram: null }}
        onChange={setVerfahren}
      />
      <label className="inline-label">
        Fillers (before and after)
        <input className="hand-input fillers" value={fillers} maxLength={2} required pattern="[A-Za-z]{2}" onChange={(event) => setFillers(event.target.value)} />
      </label>
      <p className="notebook-actions">
        <button type="button" onClick={random}>
          Random
        </button>
        <button type="submit" disabled={!chosen}>
          Encrypt indicator
        </button>
      </p>
    </form>
  );
}

/** The indicator written out, its bigram swaps and the resulting groups. */
function IndicatorView({ operator }: { operator: OperatorState }) {
  if (!operator.schluesselkenngruppe || !operator.verfahrenkenngruppe) {
    return null;
  }

  return (
    <section className="notebook-section" aria-label="Indicator">
      <h4>Indicator · Tauschtafel {operator.table}</h4>
      <div className="indicator">
        <p className="indicator-rows">
          <Squares text={operator.fillers[0] + operator.schluesselkenngruppe} label="Upper row" />
          <Squares text={operator.verfahrenkenngruppe + operator.fillers[1]} label="Lower row" />
        </p>
        <p className="indicator-swaps" aria-label="Swaps">
          {operator.bigrams.map((bigram) => (
            <Hand key={bigram.from}>
              {bigram.from}→{bigram.to}
            </Hand>
          ))}
        </p>
      </div>
      {operator.indicator && <Field label="Groups" value={operator.indicator} stacked />}
    </section>
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

/** What the operator reads and writes in one step. `current` is true while the step is being worked. */
function StepContent({ operator, step, current }: { operator: OperatorState; step: OperatorStep; current: boolean }) {
  const finishMessage = useMachine((store) => store.finishMessage);
  const sending = operator.direction === 'Send';

  switch (step) {
    case 'ChooseGroups':
      return <ChooseGroups operator={operator} current={current} />;
    case 'SetGrundstellung':
      return (
        <>
          <p>Set the rotor windows to the Grundstellung of the daily key. {rotorHint}</p>
          <Field label="Grundstellung" value={operator.grundstellung} />
        </>
      );
    case 'TypeVerfahrenkenngruppe':
      return (
        <>
          {!sending && <IndicatorView operator={operator} />}
          <p>
            Type the Verfahrenkenngruppe <Hand>{operator.verfahrenkenngruppe}</Hand>.
            {current && (
              <>
                {' '}
                Next: <Hand>{operator.expectedKey}</Hand>. {keyboardHint}
              </>
            )}
          </p>
          <Field label="Lamps" value={operator.spruchschluesselLamps} />
        </>
      );
    case 'SetSpruchschluessel':
      return (
        <>
          <p>The lamps give the Spruchschlüssel. Set the rotor windows to it. {rotorHint}</p>
          <Field label="Spruchschlüssel" value={operator.spruchschluessel ?? ''} />
        </>
      );
    case 'TypeMessage':
      return sending ? (
        <>
          <p>Type the plaintext.{current && ` ${keyboardHint}`} The lamps give the cipher text.</p>
          <Squares text={groups(operator.pad).join(' ')} label="Cipher text" />
          {current && operator.fillersNeeded > 0 && (
            <p role="status">
              Type <Hand>X</Hand> {operator.fillersNeeded} more time(s) to fill the last group.
            </p>
          )}
          {current && (
            <p className="notebook-actions">
              <button type="button" disabled={operator.pad.length === 0 || operator.fillersNeeded > 0} onClick={() => void finishMessage()}>
                Finish
              </button>
            </p>
          )}
        </>
      ) : (
        <>
          <p>
            Type the cipher text. The lamps give the plaintext, written under each letter.
            {current && (
              <>
                {' '}
                Next: <Hand>{operator.expectedKey}</Hand>. {keyboardHint}
              </>
            )}
          </p>
          <Decipherment cipher={operator.cipherText ?? ''} plain={operator.pad} />
          <Field label="Plaintext" value={groups(operator.pad).join(' ')} />
        </>
      );
    case 'Done':
      return sending && operator.message ? (
        <>
          <p>The message is encrypted. Copy the radio message and send it.</p>
          <output aria-label="Radio message" className="radio-message">
            <Squares text={operator.message} />
          </output>
          <p className="notebook-actions">
            <CopyButton text={operator.message} />
          </p>
        </>
      ) : (
        <p>The message is decrypted.</p>
      );
  }
}

/**
 * The steps, each with what the operator reads and writes in it. Finished steps are ticked off and keep their
 * contents, so the whole procedure can be read back. Steps still to come show their title only.
 */
function Procedure({ operator }: { operator: OperatorState }) {
  const cancelOperator = useMachine((store) => store.cancelOperator);
  const steps = operator.direction === 'Send' ? sendSteps : receiveSteps;
  const currentIndex = steps.indexOf(operator.step);
  const currentRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [operator.step]);

  return (
    <>
      <p className="field">
        <span className="field-label">{operator.direction === 'Send' ? 'Sending' : 'Receiving'}</span>
        <span>{operator.network}</span>
      </p>
      {operator.warnings.length > 0 && (
        <ul className="notebook-warnings" aria-label="Warnings">
          {operator.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <ol className="steps" aria-label="Steps">
        {steps.map((step, index) => {
          const current = step === operator.step;
          const done = index < currentIndex || operator.step === 'Done';
          return (
            <li
              key={step}
              ref={current ? currentRef : undefined}
              aria-current={current ? 'step' : undefined}
              aria-labelledby={`step-${step}`}
              data-done={done ? '' : undefined}
            >
              <h3 id={`step-${step}`} className="step-title">
                {stepLabels[step]}
              </h3>
              {index <= currentIndex && <StepContent operator={operator} step={step} current={current} />}
            </li>
          );
        })}
      </ol>
      <p className="notebook-actions">
        <button type="button" onClick={() => void cancelOperator()}>
          {operator.step === 'Done' ? 'New message' : 'Cancel'}
        </button>
      </p>
    </>
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
    <form className="notebook-form" aria-label="Receive a message" onSubmit={(event) => void find(event)}>
      <p>Write down the radio message as received, with its preamble. Then find the key sheet it was sent with.</p>
      <label>
        Received message
        <textarea
          className="hand-input"
          value={message}
          rows={4}
          spellCheck={false}
          placeholder="1840 = 24 = QWER TZUI ABCD EFGH QWER TZUI"
          onChange={(event) => {
            setMessage(event.target.value);
            setKeys(null);
          }}
        />
      </label>
      <label className="inline-label">
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
      <p className="notebook-actions">
        <button type="submit" disabled={message.trim() === '' || date === ''}>
          Find key
        </button>
        {appliedKey && (
          <button type="button" disabled={message.trim() === ''} onClick={() => void startReceiving(message)}>
            Receive with applied key
          </button>
        )}
      </p>
      {keys && keys.length === 0 && <p role="status">No key sheet for {date} fits this message.</p>}
      {keys && keys.length > 0 && (
        <ul className="receiving-keys" aria-label="Matching keys">
          {keys.map((key) => (
            <li key={key.sheetId}>
              <span>
                {key.network} {key.month}, day {key.day} · {key.model} · Schlüsselkenngruppe <Hand>{key.schluesselkenngruppe}</Hand>
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

function Send() {
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const startSending = useMachine((store) => store.startSending);

  return appliedKey ? (
    <>
      <p>Sending uses the applied key: its network, Grundstellung, Kenngruppenbuch and Tauschtafel.</p>
      <p className="notebook-actions">
        <button type="button" onClick={() => void startSending()}>
          Send a message
        </button>
      </p>
    </>
  ) : (
    <p>Apply a daily key to send. Sending uses its network, Grundstellung, Kenngruppenbuch and Tauschtafel.</p>
  );
}

/** Shown on the other tab while a message is in progress. */
function Busy({ running, onShow }: { running: Direction; onShow: () => void }) {
  const other = tabs.find((tab) => tab.direction === running)!;
  return (
    <>
      <p role="status">
        A message is being {running === 'Send' ? 'encrypted' : 'decrypted'}. Finish or cancel it on the {other.label} page first.
      </p>
      <p className="notebook-actions">
        <button type="button" onClick={onShow}>
          Go to {other.label}
        </button>
      </p>
    </>
  );
}

function ErrorNote() {
  const error = useMachine((store) => store.error);
  const dismiss = useMachine((store) => store.dismissError);
  if (!error) {
    return null;
  }

  return (
    <div className="notebook-error" role="alert">
      <span>
        {error.title}
        {error.detail && ` ${error.detail}`}
      </span>
      <button type="button" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  );
}

/** The operator's notebook: walks through the Navy indicator procedure while the operator works the machine. */
export function Notebook() {
  const load = useMachine((store) => store.load);
  const appliedKey = useMachine((store) => store.machine?.appliedKey);
  const operator = useMachine((store) => store.machine?.operator);
  const [chosen, setChosen] = useState<Direction | null>(null);
  const selected = chosen ?? operator?.direction ?? 'Send';
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  usePhysicalKeyboard(useKeys());

  useEffect(() => {
    void load();
  }, [load]);

  const onTabKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (tabs.findIndex((tab) => tab.direction === selected) + step + tabs.length) % tabs.length;
    setChosen(tabs[next].direction);
    tabRefs.current[next]?.focus();
  };

  let content: ReactNode;
  if (operator && operator.direction === selected) {
    content = <Procedure operator={operator} />;
  } else if (operator && operator.step !== 'Done') {
    content = <Busy running={operator.direction} onShow={() => setChosen(operator.direction)} />;
  } else {
    content = selected === 'Send' ? <Send /> : <Receive />;
  }

  return (
    <div className="notebook">
      <div className="notebook-tabs" role="tablist" aria-label="Notebook" onKeyDown={onTabKeyDown}>
        {tabs.map((tab, index) => (
          <button
            key={tab.direction}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`notebook-tab-${tab.direction}`}
            aria-selected={tab.direction === selected}
            aria-controls="notebook-page"
            tabIndex={tab.direction === selected ? 0 : -1}
            onClick={() => setChosen(tab.direction)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <ErrorNote />
      <section className="page" role="tabpanel" id="notebook-page" aria-labelledby={`notebook-tab-${selected}`}>
        {appliedKey && (
          <p className="page-key" aria-label="Daily key">
            Key: {appliedKey.network} {appliedKey.month}, day {appliedKey.day}
          </p>
        )}
        {appliedKey?.modified && (
          <p className="notebook-warning" role="status">
            The machine setup differs from the daily key.
          </p>
        )}
        {content}
      </section>
    </div>
  );
}
