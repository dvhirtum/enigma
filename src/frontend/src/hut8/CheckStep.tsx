import { useEffect, useState } from 'react';
import type { BombeCheck, BombeStop } from '../api';
import { drumLetters } from '../bombe/drums';
import { useCheckKeys } from '../bombe/checkKeys';
import { contradictionsOf, partnersOf } from '../bombe/steckers';
import { usePhysicalKeyboard } from '../useKeys';
import { alphabet } from '../machine';
import { Hand, Squares } from '../notebook/paper';
import { useMachine } from '../store';
import { groups } from './letters';

const ringLetter = (ring: number) => alphabet[ring - 1];

/**
 * The crib under the cipher letters at the stop, a column per link headed by its drum position, with the partners
 * written so far between them: under the cipher letter its partner, above the crib letter its partner. A gap shows a
 * link still to test. Contradicted partners are red; the crib letter is marked as matched, contradicted or unknown.
 */
function CribCheck({ check }: { check: BombeCheck }) {
  const partners = partnersOf(check.steckers);
  const contradicted = contradictionsOf(check.steckers);
  const written = (letter: string) => (partners[letter] ?? []).join('');

  return (
    <section className="notebook-section" aria-label="Crib">
      <h4>Crib</h4>
      <ol className="check-crib">
        {check.crib.map((letter) => {
          const position = drumLetters(letter.offset);
          return (
            <li
              key={letter.offset}
              className={letter.match.toLowerCase()}
              aria-label={`${position}: ${letter.cipher}/${written(letter.cipher) || '?'}, ${letter.plain}/${written(letter.plain) || '?'}, ${letter.match}`}
            >
              <span className="check-position">{position}</span>
              <span className="square">{letter.cipher}</span>
              {[letter.cipher, letter.plain].map((own, row) => (
                <span key={row} className={contradicted.has(own) ? 'square partner contradicted' : 'square partner'}>
                  {written(own)}
                </span>
              ))}
              <span className="square">{letter.plain}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/**
 * The stecker sheet: every partner written for each letter, itself when unsteckered, empty when unknown. A letter with
 * more than one partner, and its partners, are marked in red. While checking, the checking machine's lamps fill it in
 * and a click on a box rubs out its letter's pairs. When `editable`, partners are written in by hand, the pairs found by
 * checking are highlighted, and an unknown letter shows itself faintly: it is taken as unsteckered.
 */
function SteckerSheet({ check, editable = false }: { check: BombeCheck; editable?: boolean }) {
  const eraseLetter = useMachine((store) => store.eraseLetter);
  const setPartner = useMachine((store) => store.setPartner);
  const partners = partnersOf(check.steckers);
  const contradicted = contradictionsOf(check.steckers);
  const checked = partnersOf(check.checkedSteckers);

  // The letter typed is the one that is not an old partner, wherever the cursor was.
  const write = (letter: string, value: string) => {
    const own = partners[letter] ?? [];
    const typed = [...value.toUpperCase()].filter((character) => alphabet.includes(character));
    const partner = typed.find((character) => !own.includes(character)) ?? typed[0];
    if (partner === undefined) {
      if (value.trim() === '') {
        void setPartner(letter, null);
      }
    } else if (own.length !== 1 || own[0] !== partner) {
      void setPartner(letter, partner);
    }
  };

  return (
    <section className="notebook-section" aria-label="Steckers">
      <h4>Steckers</h4>
      <div className="stecker-sheet">
        {[...alphabet].map((letter) => {
          const own = partners[letter] ?? [];
          const red = contradicted.has(letter);
          const found = editable && own.length === 1 && checked[letter]?.[0] === own[0];
          const classes = [own.length === 1 && own[0] === letter ? 'self' : '', red ? 'contradicted' : '', found ? 'checked' : ''];
          return (
            <div key={letter} className={classes.filter(Boolean).join(' ') || undefined}>
              <span>{letter}</span>
              {editable ? (
                <input
                  className="hand-box"
                  value={own.join('')}
                  placeholder={letter}
                  title={found ? 'Found while checking the stop' : own.length === 0 ? 'Not found yet: taken as unsteckered' : undefined}
                  aria-label={`Partner of ${letter}`}
                  aria-description={found ? 'found while checking' : own.length === 0 ? 'taken as unsteckered' : undefined}
                  aria-invalid={red || undefined}
                  spellCheck={false}
                  autoComplete="off"
                  onChange={(event) => write(letter, event.target.value)}
                />
              ) : (
                <button
                  type="button"
                  className="hand-box"
                  aria-label={`Partner of ${letter}: ${own.length > 0 ? own.join(' ') : 'unknown'}${red ? ', contradicted' : ''}`}
                  title={own.length > 0 ? `Rub out ${letter}` : undefined}
                  disabled={own.length === 0}
                  onClick={() => void eraseLetter(letter)}
                >
                  {own.join('')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {editable && (
        <p className="hut8-note">
          <mark className="checked-mark">Highlighted</mark> pairs were found while checking the stop. A faint letter is not found yet and is taken as
          unsteckered.
        </p>
      )}
      {check.contradicted && (
        <p className="notebook-warning">
          The lamps contradict each other at {[...check.contradicted].join(', ')}: a sign of a false stop.{' '}
          {editable ? 'Write the right partner in, or clear the box.' : 'Click a box to rub it out.'}
        </p>
      )}
    </section>
  );
}

/** The right ring, turned by hand or found, with each ring's score after Find. */
function RightRing({ check }: { check: BombeCheck }) {
  const stepRightRing = useMachine((store) => store.stepRightRing);
  const findRightRing = useMachine((store) => store.findRightRing);
  const scores = useMachine((store) => store.ringScores);
  const turn = (steps: number) => void stepRightRing(steps);
  const known = scores?.flatMap((ring) => (ring.score === null ? [] : [ring.score])) ?? [];
  const low = Math.min(0, ...known);
  const high = Math.max(...known, low + 1);
  const best = scores?.filter((ring) => ring.best) ?? [];

  return (
    <section className="notebook-section" aria-label="Right ring">
      <h4>Right ring</h4>
      <p className="notebook-actions">
        <button type="button" aria-label="Previous ring" onClick={() => turn(-1)}>
          ◀
        </button>
        <output aria-label="Right ring setting" className="hand">
          {ringLetter(check.rightRing)} ({String(check.rightRing).padStart(2, '0')})
        </output>
        <button type="button" aria-label="Next ring" onClick={() => turn(1)}>
          ▶
        </button>
        <button type="button" onClick={() => void findRightRing()}>
          Find
        </button>
      </p>
      <p className="hut8-note">Left and middle rings stay at Z until the indicators are read.</p>
      {scores && (
        <>
          <svg className="ring-scores" viewBox="0 0 520 90" role="img" aria-label="Scores of the right rings">
            {scores.map((ring, index) => {
              const barHeight = ring.score === null ? 0 : ((ring.score - low) / (high - low)) * 64;
              const classes = ['ring-bar', ring.best ? 'best' : '', ring.ring === check.rightRing ? 'set' : ''].filter(Boolean).join(' ');
              return (
                <g key={ring.ring} className={classes}>
                  <title>{`${ringLetter(ring.ring)}: ${ring.score === null ? 'no score' : ring.score.toFixed(1)}`}</title>
                  <rect x={index * 20 + 3} y={70 - barHeight} width={14} height={Math.max(barHeight, 1)} />
                  <text x={index * 20 + 10} y={85}>
                    {ringLetter(ring.ring)}
                  </text>
                </g>
              );
            })}
          </svg>
          {best.length > 1 && (
            <p className="notebook-warning">
              Not determined yet: {best.length === 26 ? 'every ring ties' : `rings ${best.map((ring) => ringLetter(ring.ring)).join(', ')} tie`}. Find
              more steckers, then Find again.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Suggest's proposed steckers, each accepted on its own or all at once. */
function Suggestions() {
  const suggestion = useMachine((store) => store.suggestion);
  const suggestSteckers = useMachine((store) => store.suggestSteckers);
  const acceptSuggestion = useMachine((store) => store.acceptSuggestion);

  return (
    <section className="notebook-section" aria-label="Suggestions">
      <p className="notebook-actions">
        <button type="button" onClick={() => void suggestSteckers()}>
          Suggest
        </button>
        {suggestion && suggestion.pairs.length === 0 && <span className="hut8-note">No confident pairs.</span>}
      </p>
      {suggestion && suggestion.pairs.length > 0 && (
        <>
          <ul className="suggestions">
            {suggestion.pairs.map(({ pair, gain }) => (
              <li key={pair}>
                <Hand>{pair[0] === pair[1] ? `${pair[0]} unsteckered` : `${pair[0]}/${pair[1]}`}</Hand>
                <span className="hut8-note">gain {gain.toFixed(1)}</span>
                <button type="button" aria-label={`Accept ${pair}`} onClick={() => void acceptSuggestion([pair])}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
          <p className="notebook-actions">
            <button type="button" onClick={() => void acceptSuggestion(suggestion.pairs.map(({ pair }) => pair))}>
              Accept all
            </button>
          </p>
          <p className="hut8-note">With these:</p>
          <Squares text={groups(suggestion.decrypt)} label="Decrypt with the suggestions" />
        </>
      )}
    </section>
  );
}

const verdictLabels: Record<BombeStop['verdict'], string> = { True: 'True stop', False: 'False stop', Unchecked: 'Unchecked' };

/** The verdict on the stop, and how it compares with the crib and the solution. */
function Verdict({ check }: { check: BombeCheck }) {
  const confirmCheck = useMachine((store) => store.confirmCheck);
  const confirmation = useMachine((store) => store.confirmation);
  const solution = confirmation?.solution;

  return (
    <section className="notebook-section" aria-label="Verdict">
      <h4>Verdict</h4>
      <p className="notebook-actions" role="group" aria-label="Give the verdict">
        {(['True', 'False', 'Unchecked'] as const).map((verdict) => (
          <button key={verdict} type="button" aria-pressed={check.verdict === verdict} onClick={() => void confirmCheck(verdict)}>
            {verdictLabels[verdict]}
          </button>
        ))}
      </p>
      {confirmation && (
        <ul className="confirmation">
          <li>
            {confirmation.cribMismatches.length > 0
              ? `The steckers contradict the crib at ${confirmation.cribMismatches.join(', ')}.`
              : confirmation.cribUnknown.length > 0
                ? `The crib matches so far; ${confirmation.cribUnknown.length} letters are still unknown.`
                : 'The whole crib matches.'}
          </li>
          {solution && (
            <>
              <li>
                {solution.isTrueStop ? 'This is the true stop' : 'This is a false stop'}, so the verdict is {solution.verdictCorrect ? 'right' : 'wrong'}.
              </li>
              {solution.isTrueStop && (
                <>
                  <li>{solution.wrongPairs.length > 0 ? `Wrong pairs: ${solution.wrongPairs.join(' ')}.` : 'No wrong pairs.'}</li>
                  <li>{solution.missingPairs.length > 0 ? `Missing plug pairs: ${solution.missingPairs.join(' ')}.` : 'Every plug pair found.'}</li>
                </>
              )}
            </>
          )}
        </ul>
      )}
    </section>
  );
}

/**
 * Sets the checking machine up for the stop: at once when it is empty or set up for another stop, after asking when it
 * was set up by hand.
 */
function CheckerSetup({ check }: { check: BombeCheck }) {
  const checker = useMachine((store) => store.bombe?.checker);
  const setUpChecker = useMachine((store) => store.setUpChecker);
  const [kept, setKept] = useState<number | null>(null);
  const stop = check.stop.index;
  const ready = checker?.stop?.index === stop;
  const byHand = !ready && checker !== undefined && checker.stop === null && checker.drums.some(Boolean);

  useEffect(() => {
    if (checker && !ready && !byHand) {
      void setUpChecker(stop);
    }
  }, [checker, ready, byHand, stop, setUpChecker]);

  if (!byHand) {
    return null;
  }
  return kept === stop ? (
    <p className="notebook-actions">
      <button type="button" onClick={() => void setUpChecker(stop)}>
        Set up the checking machine for this stop
      </button>
    </p>
  ) : (
    <p className="notebook-warning" role="alert">
      The checking machine is set up by hand. Set it up for this stop?{' '}
      <button type="button" onClick={() => void setUpChecker(stop)}>
        Set it up
      </button>{' '}
      <button type="button" onClick={() => setKept(stop)}>
        Keep it as it is
      </button>
    </p>
  );
}

/** The verdict and the plug pairs found, in one line. */
export function CheckSummary({ check }: { check: BombeCheck }) {
  return (
    <p>
      {verdictLabels[check.verdict]}: steckers <Hand>{check.key.plugs.join(' ') || '—'}</Hand>
    </p>
  );
}

/** The right ring and the plug pairs, in one line. */
export function KeySummary({ check }: { check: BombeCheck }) {
  return (
    <p>
      Right ring <Hand>{ringLetter(check.rightRing)}</Hand>, plugs <Hand>{check.key.plugs.join(' ') || '—'}</Hand>
    </p>
  );
}

/**
 * Checks the stop: typed letters press the checking machine, whose lamps fill in the stecker sheet by following the
 * menu, until the steckers bear the stop out or contradict it.
 */
export function CheckStep({ check }: { check: BombeCheck }) {
  usePhysicalKeyboard(useCheckKeys());
  return (
    <>
      <p>
        Test the stop on the checking machine on the <strong>Checking</strong> tab of the machine window: turn the drums to a link's position and type
        the partner of one of its letters, here or in the machine window. The lamp is written down as the partner of the other letter. Follow the menu
        until the steckers bear the stop out or contradict it.
      </p>
      <CheckerSetup check={check} />
      <CribCheck check={check} />
      <SteckerSheet check={check} />
      <Verdict check={check} />
    </>
  );
}

/**
 * Reads the message with the true stop, as on the Enigma: the right ring, the steckers the menu does not reach, the
 * decrypt, the key it gives, and the hand-off to Enigma mode, which asks before replacing the Enigma setup.
 */
export function KeyStep({ check }: { check: BombeCheck }) {
  const setUpEnigma = useMachine((store) => store.setUpEnigma);
  const { key } = check;

  return (
    <>
      <p>
        Read the message as on the Enigma: find the right ring and the steckers the menu does not reach, with Suggest and Find or by writing partners
        on the sheet, until the message reads as German.
      </p>
      <RightRing check={check} />
      <Suggestions />
      <SteckerSheet check={check} editable />
      <section className="notebook-section" aria-label="Decrypt">
        <h4>Decrypt</h4>
        <Squares text={groups(check.decrypt)} label="Decrypt" />
      </section>
      <dl className="checked-key" aria-label="Key">
        <dt>Reflector</dt>
        <dd className="hand">{key.reflector}</dd>
        <dt>Wheel order</dt>
        <dd className="hand">{key.wheelOrder}</dd>
        <dt>Rings</dt>
        <dd>
          <Hand>{key.rings.map((ring) => ringLetter(ring)).join(' ')}</Hand> <span className="hut8-note">(left and middle unknown)</span>
        </dd>
        <dt>Plugs</dt>
        <dd className="hand">{key.plugs.join(' ') || '—'}</dd>
        <dt>Message key</dt>
        <dd className="hand">{key.messageKey}</dd>
      </dl>
      <SetUpEnigma setUp={setUpEnigma} />
    </>
  );
}

/**
 * Sets up the Enigma after asking, as the setup is replaced, and then switches the machine window to Enigma mode.
 */
export function SetUpEnigma({ setUp, label = 'Set up Enigma' }: { setUp: () => Promise<boolean>; label?: string }) {
  const showMode = useMachine((store) => store.showMode);
  const [confirming, setConfirming] = useState(false);

  const confirm = async () => {
    setConfirming(false);
    if (await setUp()) {
      await showMode('enigma');
    }
  };

  return confirming ? (
    <p className="notebook-actions" role="group" aria-label="Confirm Enigma setup">
      <span>This replaces the Enigma setup.</span>
      <button type="button" onClick={() => void confirm()}>
        Set up
      </button>
      <button type="button" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </p>
  ) : (
    <p className="notebook-actions">
      <button type="button" onClick={() => setConfirming(true)}>
        {label}
      </button>
    </p>
  );
}
