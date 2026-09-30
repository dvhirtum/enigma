import { useEffect, useState } from 'react';
import type { BombeCheck, BombeStop } from '../api';
import { drumLetters, scramblersOf } from '../bombe/drums';
import { partnersOf } from '../bombe/steckers';
import { alphabet } from '../machine';
import { Hand, Squares } from '../notebook/paper';
import { useMachine } from '../store';
import { groups } from './letters';

const ringLetter = (ring: number) => alphabet[ring - 1];

/** The menu's links by offset, each with the drum position to turn the checking machine to. */
function MenuLinks() {
  const links = useMachine((store) => store.bombe?.menu?.links);
  if (!links?.length) {
    return null;
  }

  return (
    <section className="notebook-section" aria-label="Menu links">
      <h4>Menu links</h4>
      <ol className="check-links">
        {scramblersOf(links).map((link) => (
          <li key={link.id}>
            <span>{link.offset}</span>
            <span className="hand">
              {link.first}–{link.second}
            </span>
            <span className="hand">{drumLetters(link.offset)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The crib under the cipher letters at the stop, each marked as matched, contradicted or still unknown. */
function CribCheck({ check }: { check: BombeCheck }) {
  return (
    <section className="notebook-section" aria-label="Crib">
      <h4>Crib</h4>
      <div className="check-crib">
        {check.crib.map((letter) => (
          <span key={letter.offset} className={letter.match.toLowerCase()} title={`${letter.offset}: ${letter.match}`}>
            <span className="square">{letter.cipher}</span>
            <span className="square">{letter.plain}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/** The stecker sheet: each letter's partner, itself when unsteckered, empty when unknown. */
function SteckerSheet({ check }: { check: BombeCheck }) {
  const setPartner = useMachine((store) => store.setPartner);
  const partners = partnersOf(check.steckers);

  // The letter typed is the one that is not the old partner, wherever the cursor was.
  const onChange = (letter: string, value: string) => {
    const typed = [...value.toUpperCase()];
    const partner = typed.find((character) => character !== partners[letter]) ?? typed[0] ?? '';
    if (partner !== '' && !alphabet.includes(partner)) {
      return;
    }
    void setPartner(letter, partner || null);
  };

  return (
    <section className="notebook-section" aria-label="Steckers">
      <h4>Steckers</h4>
      <div className="stecker-sheet">
        {[...alphabet].map((letter) => (
          <label key={letter} className={partners[letter] === letter ? 'self' : undefined}>
            <span>{letter}</span>
            <input
              className="hand-input"
              value={partners[letter] ?? ''}
              aria-label={`Partner of ${letter}`}
              maxLength={2}
              spellCheck={false}
              onChange={(event) => onChange(letter, event.target.value)}
            />
          </label>
        ))}
      </div>
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
                  <li>The right ring is {solution.rightRingCorrect ? 'right' : 'wrong'}.</li>
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

/** The checked steckers and right ring, in one line each. */
export function CheckSummary({ check }: { check: BombeCheck }) {
  return (
    <p>
      {verdictLabels[check.verdict]}: steckers <Hand>{check.steckers || '—'}</Hand>, right ring <Hand>{ringLetter(check.rightRing)}</Hand>
    </p>
  );
}

/**
 * Checks the stop: the steckers the Bombe gave are tried on the checking machine in the machine window, and the others
 * are found by hand, with Suggest, until the crib and the rest of the message read right.
 */
export function CheckStep({ check }: { check: BombeCheck }) {
  return (
    <>
      <p>
        Test the stop on the checking machine on the <strong>Checking</strong> tab of the machine window: set the drums to each link's position, press
        a letter and write down the stecker its lamp gives. Fill in the rest with Suggest and Find until the message reads as German.
      </p>
      <CheckerSetup check={check} />
      <MenuLinks />
      <CribCheck check={check} />
      <SteckerSheet check={check} />
      <RightRing check={check} />
      <Suggestions />
      <section className="notebook-section" aria-label="Decrypt">
        <h4>Decrypt</h4>
        <Squares text={groups(check.decrypt)} label="Decrypt" />
      </section>
      <Verdict check={check} />
    </>
  );
}

/** The key the true stop gives, the message read with it, and the hand-off to Enigma mode, which asks before replacing the Enigma setup. */
export function KeyStep({ check }: { check: BombeCheck }) {
  const setUpEnigma = useMachine((store) => store.setUpEnigma);
  const showMode = useMachine((store) => store.showMode);
  const [confirming, setConfirming] = useState(false);
  const { key } = check;

  const setUp = async () => {
    setConfirming(false);
    if (await setUpEnigma()) {
      await showMode('enigma');
    }
  };

  return (
    <>
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
      <Squares text={groups(check.decrypt)} label="Plain text" />
      {confirming ? (
        <p className="notebook-actions" role="group" aria-label="Confirm Enigma setup">
          <span>This replaces the Enigma setup.</span>
          <button type="button" onClick={() => void setUp()}>
            Set up
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </p>
      ) : (
        <p className="notebook-actions">
          <button type="button" onClick={() => setConfirming(true)}>
            Set up Enigma
          </button>
        </p>
      )}
    </>
  );
}
