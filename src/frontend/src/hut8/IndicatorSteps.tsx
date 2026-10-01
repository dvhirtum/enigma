import { useEffect, useState, type FormEvent } from 'react';
import type { BombeCheck, BombeState, DayMessage, DayTraffic, RingTable } from '../api';
import { alphabet } from '../machine';
import { Field, Hand, Squares } from '../notebook/paper';
import { KeySheetSelects, shownMonth } from '../panels/KeySheetSelects';
import { useMachine } from '../store';
import { SetUpEnigma } from './CheckStep';
import { cribLetters, groups } from './letters';

const ringLetter = (ring: number) => alphabet[ring - 1];

/** Whether the indicators of the loaded message can be read: a Navy radio message whose key sheet day can be pinched. */
export function canReadIndicators(bombe: BombeState): boolean {
  return bombe.source !== null && bombe.source.kind !== 'Intercept' && bombe.source.message !== null;
}

/** Why the indicators of the loaded message cannot be read, with an intercept's published rings. */
export function NoIndicators() {
  const source = useMachine((store) => store.bombe?.source);
  const loadSolution = useMachine((store) => store.loadSolution);
  const [rings, setRings] = useState<number[] | null>(null);
  const intercept = source?.kind === 'Intercept';
  const hasSolution = source?.hasSolution === true;

  useEffect(() => {
    if (intercept && hasSolution) {
      void loadSolution().then((solution) => setRings(solution?.rings ?? null));
    }
  }, [intercept, hasSolution, loadSolution]);

  return intercept ? (
    <p className="hut8-note">
      The key sheet day of this intercept is not known, so its indicator cannot be read here.
      {rings && (
        <>
          {' '}
          Its published rings are <Hand>{rings.map(ringLetter).join(' ')}</Hand>.
        </>
      )}
    </p>
  ) : (
    <p className="hut8-note">Bare cipher text has no indicator to read. Load the whole radio message to read the indicators.</p>
  );
}

/** Picks the key sheet day a pasted message was sent on, as the day of the pinch. */
function DayPicker({ day }: { day: DayTraffic | null }) {
  const keySheets = useMachine((store) => store.keySheets);
  const loadKeySheets = useMachine((store) => store.loadKeySheets);
  const takePinch = useMachine((store) => store.takePinch);
  const sheets = keySheets.filter((sheet) => sheet.model === 'M3');
  const [chosenMonth, setChosenMonth] = useState(day?.month ?? null);
  const [sheetId, setSheetId] = useState(day?.sheetId ?? '');
  const [dayNumber, setDayNumber] = useState(day?.day ?? 1);
  const month = shownMonth(sheets, chosenMonth);
  const chosen = sheets.some((sheet) => sheet.id === sheetId && sheet.month === month) ? sheetId : '';

  useEffect(() => {
    void loadKeySheets();
  }, [loadKeySheets]);

  const chooseMonth = (value: string) => {
    setChosenMonth(value);
    setSheetId('');
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (chosen) {
      void takePinch(chosen, dayNumber);
    }
  };

  return (
    <form className="notebook-form" aria-label="Day of the pinch" onSubmit={onSubmit}>
      <p className="notebook-actions">
        <KeySheetSelects sheets={sheets} month={month} sheetId={chosen} onMonth={chooseMonth} onSheet={setSheetId} labelClassName="inline-label" />
        <label className="inline-label">
          Day
          <input type="number" min={1} max={31} value={dayNumber} onChange={(event) => setDayNumber(Number(event.target.value))} />
        </label>
        <button type="submit" disabled={!chosen}>
          Take the pinch
        </button>
      </p>
      {sheets.length === 0 && <p className="notebook-warning">Generate or import M3 key sheets first.</p>}
    </form>
  );
}

/** The bigram table of the pinch: the pair in the row of its first letter and the column of its second is swapped with the pair written there. */
function BigramTable({ day }: { day: DayTraffic }) {
  const partner = new Map<string, string>();
  for (const swap of day.swaps) {
    partner.set(swap.slice(0, 2), swap.slice(2, 4));
    partner.set(swap.slice(2, 4), swap.slice(0, 2));
  }

  return (
    <details className="bigram-table">
      <summary>Tauschtafel {day.table}</summary>
      <table aria-label={`Tauschtafel ${day.table}`}>
        <thead>
          <tr>
            <th />
            {[...alphabet].map((second) => (
              <th key={second} scope="col">
                {second}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...alphabet].map((first) => (
            <tr key={first}>
              <th scope="row">{first}</th>
              {[...alphabet].map((second) => (
                <td key={second}>{partner.get(first + second) ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}

/** The pinch: taken for an exercise's own day or a pasted message's chosen day, then its Grundstellung and bigram table. */
function Pinch({ day }: { day: DayTraffic | null }) {
  const pasted = useMachine((store) => store.bombe?.source?.kind === 'Pasted');
  const takePinch = useMachine((store) => store.takePinch);

  return (
    <section className="notebook-section" aria-label="Pinch">
      <h4>The pinch</h4>
      <p>
        Hut 8 sometimes held a day&apos;s Grundstellung and bigram tables, captured from a ship or a weather trawler (a pinch).
        {pasted ? ' Choose the key sheet day the message was sent on.' : ' Take the pinch of the day this exercise was sent on.'}
      </p>
      {pasted ? (
        <DayPicker day={day} />
      ) : (
        !day && (
          <p className="notebook-actions">
            <button type="button" onClick={() => void takePinch()}>
              Take the pinch
            </button>
          </p>
        )
      )}
      {day && (
        <>
          <Field label="Key sheet" value={`${day.network} ${day.month} ${String(day.day).padStart(2, '0')}`} />
          <Field label="Grundstellung" value={day.grundstellung} />
          <BigramTable day={day} />
        </>
      )}
    </section>
  );
}

/** A box for a three-letter group, written down once all three letters are in or rubbed out when emptied. */
function GroupBox({ label, value, right, onWrite }: { label: string; value: string | null; right: boolean | null; onWrite: (group: string) => void }) {
  const [draft, setDraft] = useState(value ?? '');
  const [written, setWritten] = useState(value);
  if (value !== written) {
    setWritten(value);
    setDraft(value ?? '');
  }

  const write = (text: string) => {
    const letters = cribLetters(text).slice(0, 3);
    setDraft(letters);
    if (letters.length === 3 || letters.length === 0) {
      onWrite(letters);
    }
  };

  return (
    <span className="group-box">
      <label className="inline-label">
        {label}
        <input
          className="hand-input group-input"
          value={draft}
          aria-invalid={right === false || undefined}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => write(event.target.value)}
        />
      </label>
      {right !== null && (
        <span className={right ? 'group-right' : 'group-wrong'} aria-label={right ? 'right' : 'wrong'}>
          {right ? '✓' : '✗'}
        </span>
      )}
    </span>
  );
}

/**
 * The indicator groups of a message, written one above the other, with the Schlüsselkenngruppe and the
 * Verfahrenkenngruppe read from them with the bigram table, by hand or filled in.
 */
function IndicatorWriting({ index, message }: { index: number; message: DayMessage }) {
  const writeIndicator = useMachine((store) => store.writeIndicator);
  const fillInIndicator = useMachine((store) => store.fillInIndicator);
  const [upper, lower] = message.indicator.split(' ');

  return (
    <div className="indicator-reading">
      <p className="indicator-rows">
        <Squares text={upper} label="Upper indicator group" />
        <Squares text={lower} label="Lower indicator group" />
      </p>
      <p className="notebook-actions">
        <GroupBox
          label="Schlüsselkenngruppe"
          value={message.schluesselkenngruppe}
          right={message.schluesselkenngruppeRight}
          onWrite={(group) => void writeIndicator(index, { schluesselkenngruppe: group })}
        />
        <GroupBox
          label="Verfahrenkenngruppe"
          value={message.verfahrenkenngruppe}
          right={message.verfahrenkenngruppeRight}
          onWrite={(group) => void writeIndicator(index, { verfahrenkenngruppe: group })}
        />
        <button type="button" onClick={() => void fillInIndicator(index)}>
          Fill in
        </button>
      </p>
    </div>
  );
}

/**
 * The ring table: for each left (row) and middle (column) ring, the cores at the crib that the Spruchschlüssel leads
 * to. The cell with the stop's cores gives the rings; a click reads them.
 */
function RingTableGrid({ check, table }: { check: BombeCheck; table: RingTable }) {
  const readRings = useMachine((store) => store.readRings);
  const reading = check.reading;

  return (
    <section className="notebook-section" aria-label="Ring table">
      <h4>Ring table</h4>
      <p>
        Each square is a pair of left (row) and middle (column) rings. Set up with them, the Enigma turns the Verfahrenkenngruppe{' '}
        <Hand>{table.verfahrenkenngruppe}</Hand> at the Grundstellung <Hand>{table.grundstellung}</Hand> into a Spruchschlüssel; from there it steps
        to the cores written in the square at the start of the crib. Find the square with the stop&apos;s cores and click it.
      </p>
      <Field label="Stop's cores" value={table.cores} />
      <div className="ring-table-scroll">
        <table className="ring-table">
          <thead>
            <tr>
              <th />
              {[...alphabet].map((middle) => (
                <th key={middle} scope="col">
                  {middle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...alphabet].map((left, row) => (
              <tr key={left}>
                <th scope="row">{left}</th>
                {table.rows.slice(row * 26, row * 26 + 26).map((cell) => {
                  const read = reading?.left === cell.left && reading.middle === cell.middle;
                  return (
                    <td key={cell.middle} className={read ? 'read' : undefined}>
                      <button
                        type="button"
                        aria-label={`Rings ${ringLetter(cell.left)} ${ringLetter(cell.middle)}: Spruchschlüssel ${cell.spruchschluessel}, cores ${cell.cores}`}
                        aria-pressed={read}
                        title={`Spruchschlüssel ${cell.spruchschluessel}`}
                        onClick={() => void readRings(cell.left, cell.middle)}
                      >
                        {cell.cores}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** The rings read, the whole key they give and the message decrypted with it. */
function ReadingResult({ check, table }: { check: BombeCheck; table: RingTable | null }) {
  const readRings = useMachine((store) => store.readRings);
  const reading = check.reading;
  if (!reading) {
    return null;
  }

  const { key } = reading;
  const row = table?.rows.find((cell) => cell.left === reading.left && cell.middle === reading.middle);
  return (
    <section className="notebook-section" aria-label="Key">
      <h4>Key</h4>
      <dl className="checked-key" aria-label="Whole key">
        <dt>Wheel order</dt>
        <dd className="hand">{key.wheelOrder}</dd>
        <dt>Rings</dt>
        <dd className="hand">{key.rings.map(ringLetter).join(' ')}</dd>
        <dt>Plugs</dt>
        <dd className="hand">{key.plugs.join(' ') || '—'}</dd>
        <dt>Spruchschlüssel</dt>
        <dd className="hand">{key.messageKey}</dd>
      </dl>
      {row && table && row.cores !== table.cores && (
        <p className="notebook-warning">
          These rings lead to cores <Hand>{row.cores}</Hand>, not the stop&apos;s <Hand>{table.cores}</Hand>.
        </p>
      )}
      {reading.ringsRight !== null && (
        <p className={reading.ringsRight ? 'hut8-note' : 'notebook-warning'}>
          {reading.ringsRight ? 'These are the rings of the key sheet.' : 'These are not the rings of the key sheet.'}
        </p>
      )}
      <Squares text={groups(reading.decrypt)} label="Decrypt with the whole key" />
      <p className="notebook-actions">
        <button type="button" onClick={() => void readRings(null, null)}>
          Rub out the rings
        </button>
      </p>
    </section>
  );
}

/**
 * Reads the left and middle rings from the indicator: the pinch gives the Grundstellung and the bigram table, the
 * indicator gives the Verfahrenkenngruppe, and the ring table gives the rings whose Spruchschlüssel leads to the stop.
 */
export function IndicatorsStep({ check }: { check: BombeCheck }) {
  const day = useMachine((store) => store.bombe?.day ?? null);
  const table = useMachine((store) => store.ringTable);
  const loadRingTable = useMachine((store) => store.loadRingTable);
  const broken = day?.messages[0];
  const ready = broken?.verfahrenkenngruppeRight === true;

  useEffect(() => {
    if (ready) {
      void loadRingTable();
    }
  }, [ready, broken?.verfahrenkenngruppe, check.stop.index, check.steckers, check.rightRing, day?.grundstellung, loadRingTable]);

  return (
    <>
      <p>
        The left and middle rings hardly change the message, but the day&apos;s other messages need them: each starts from the Spruchschlüssel its
        indicator gives at the Grundstellung.
      </p>
      <Pinch day={day} />
      {broken && (
        <section className="notebook-section" aria-label="Indicator">
          <h4>Indicator</h4>
          <p>
            Swap each vertical pair of the indicator groups with the bigram table. The upper row then holds a filler and the Schlüsselkenngruppe, the
            lower row the Verfahrenkenngruppe and a filler.
          </p>
          <IndicatorWriting index={0} message={broken} />
        </section>
      )}
      {ready && table && <RingTableGrid check={check} table={table} />}
      <ReadingResult check={check} table={table} />
    </>
  );
}

/** The rings read, in one line. */
export function IndicatorsSummary({ check }: { check: BombeCheck }) {
  return (
    check.reading && (
      <p>
        Rings <Hand>{check.reading.key.rings.map(ringLetter).join(' ')}</Hand>, Spruchschlüssel <Hand>{check.reading.key.messageKey}</Hand>
      </p>
    )
  );
}

/**
 * The day's other messages: each indicator read with the bigram table, then each message read on the Enigma set up
 * with the whole key at the Grundstellung.
 */
export function TrafficStep({ check }: { check: BombeCheck }) {
  const day = useMachine((store) => store.bombe?.day);
  const setUpDayEnigma = useMachine((store) => store.setUpDayEnigma);
  if (!day || !check.reading) {
    return null;
  }

  const { key } = check.reading;
  return (
    <>
      <p>
        With the whole key, every message of the day can be read. For each one, read its indicator with the bigram table. Set up the Enigma at the
        Grundstellung, type the Verfahrenkenngruppe and write down the lamps: the Spruchschlüssel. Turn the rotors to it and type the cipher text. The{' '}
        <strong>Lamps</strong> tab of the operator&apos;s notebook writes down every lamp.
      </p>
      <dl className="checked-key" aria-label="Key of the day">
        <dt>Reflector</dt>
        <dd className="hand">{key.reflector}</dd>
        <dt>Wheel order</dt>
        <dd className="hand">{key.wheelOrder}</dd>
        <dt>Rings</dt>
        <dd className="hand">{key.rings.map(ringLetter).join(' ')}</dd>
        <dt>Plugs</dt>
        <dd className="hand">{key.plugs.join(' ') || '—'}</dd>
        <dt>Grundstellung</dt>
        <dd className="hand">{day.grundstellung}</dd>
      </dl>
      <SetUpEnigma setUp={setUpDayEnigma} label="Set up Enigma at the Grundstellung" />
      <ol className="day-messages" aria-label="Messages of the day">
        {day.messages.slice(1).map((message, index) => (
          <li key={message.message} aria-label={`Message ${index + 1}`}>
            <Squares text={message.message} label={`Radio message ${index + 1}`} />
            <IndicatorWriting index={index + 1} message={message} />
          </li>
        ))}
      </ol>
    </>
  );
}
