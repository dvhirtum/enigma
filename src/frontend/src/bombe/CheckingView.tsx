import { useState } from 'react';
import type { BombeCheck, BombeStop } from '../api';
import { alphabet } from '../machine';
import { useSetMode } from '../mode';
import { useMachine } from '../store';
import { CheckingMachine } from './CheckingMachine';
import { scramblersOf } from './drums';
import { drumLetters } from './MenuView';
import { groups } from './MessageView';
import { partnersOf } from './steckers';

const ringLetter = (ring: number) => alphabet[ring - 1];

function StopSummary({ check }: { check: BombeCheck }) {
  const { stop } = check;
  return (
    <p className="summary">
      Stop {stop.index + 1}: {stop.wheelOrder}, indicator <span className="letters">{stop.indicator}</span>,{' '}
      {stop.stecker ? `${stop.testRegister}/${stop.stecker}` : 'no stecker'}
    </p>
  );
}

/** The menu's links by offset, each with the drum position to turn the checking machine to. */
function MenuLinks() {
  const links = useMachine((store) => store.bombe?.menu?.links);
  if (!links?.length) {
    return null;
  }

  return (
    <section aria-label="Menu links">
      <h3>Menu links</h3>
      <ol className="menu-links">
        {scramblersOf(links).map((link) => (
          <li key={link.id}>
            <span>{link.offset}</span>
            <span className="letters">
              {link.first}–{link.second}
            </span>
            <span className="letters">{drumLetters(link.offset)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** The crib under the cipher letters at the stop, each marked as matched, contradicted or still unknown. */
function CribCheck({ check }: { check: BombeCheck }) {
  return (
    <section aria-label="Crib">
      <h3>Crib</h3>
      <div className="check-crib">
        {check.crib.map((letter) => (
          <span key={letter.offset} className={letter.match.toLowerCase()} title={`${letter.offset}: ${letter.match}`}>
            <span>{letter.cipher}</span>
            <span>{letter.plain}</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/** The steckers written down while checking: each letter's partner, itself when unsteckered, empty when unknown. */
function SteckerGrid({ check }: { check: BombeCheck }) {
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
    <section aria-label="Steckers">
      <h3>Steckers</h3>
      <div className="stecker-grid">
        {[...alphabet].map((letter) => (
          <label key={letter} className={partners[letter] === letter ? 'self' : undefined}>
            <span>{letter}</span>
            <input
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
    <section aria-label="Right ring">
      <h3>Right ring</h3>
      <div className="right-ring">
        <button type="button" aria-label="Previous ring" onClick={() => turn(-1)}>
          ◀
        </button>
        <output aria-label="Right ring setting">
          {ringLetter(check.rightRing)} ({String(check.rightRing).padStart(2, '0')})
        </output>
        <button type="button" aria-label="Next ring" onClick={() => turn(1)}>
          ▶
        </button>
        <button type="button" onClick={() => void findRightRing()}>
          Find
        </button>
        <span className="summary">Left and middle rings stay at Z until the indicators are read.</span>
      </div>
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
            <p className="menu-warning">
              Not determined yet: {best.length === 26 ? 'every ring ties' : `rings ${best.map((ring) => ringLetter(ring.ring)).join(', ')} tie`}.
              Find more steckers, then Find again.
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
    <section aria-label="Suggestions">
      <div className="check-actions">
        <button type="button" onClick={() => void suggestSteckers()}>
          Suggest
        </button>
        {suggestion && suggestion.pairs.length === 0 && <span className="summary">No confident pairs.</span>}
      </div>
      {suggestion && suggestion.pairs.length > 0 && (
        <>
          <ul className="suggestions">
            {suggestion.pairs.map(({ pair, gain }) => (
              <li key={pair}>
                <span className="letters">{pair[0] === pair[1] ? `${pair[0]} unsteckered` : `${pair[0]}/${pair[1]}`}</span>
                <span className="summary">gain {gain.toFixed(1)}</span>
                <button type="button" aria-label={`Accept ${pair}`} onClick={() => void acceptSuggestion([pair])}>
                  Accept
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => void acceptSuggestion(suggestion.pairs.map(({ pair }) => pair))}>
            Accept all
          </button>
          <p className="summary">With these: </p>
          <pre className="check-decrypt" aria-label="Decrypt with the suggestions">
            {groups(suggestion.decrypt)}
          </pre>
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
    <section aria-label="Verdict">
      <h3>Verdict</h3>
      <div className="check-actions" role="group" aria-label="Give the verdict">
        {(['True', 'False', 'Unchecked'] as const).map((verdict) => (
          <button key={verdict} type="button" aria-pressed={check.verdict === verdict} onClick={() => void confirmCheck(verdict)}>
            {verdictLabels[verdict]}
          </button>
        ))}
      </div>
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
                {solution.isTrueStop ? 'This is the true stop' : 'This is a false stop'}, so the verdict is{' '}
                {solution.verdictCorrect ? 'right' : 'wrong'}.
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

/** The key the check gives, and the hand-off to Enigma mode, which asks before replacing the Enigma setup. */
function CheckedKeyPanel({ check }: { check: BombeCheck }) {
  const setUpEnigma = useMachine((store) => store.setUpEnigma);
  const setMode = useSetMode();
  const [confirming, setConfirming] = useState(false);
  const { key } = check;

  const setUp = async () => {
    setConfirming(false);
    if (await setUpEnigma()) {
      setMode('enigma');
    }
  };

  return (
    <section aria-label="Key">
      <h3>Key</h3>
      <dl className="checked-key">
        <dt>Reflector</dt>
        <dd>{key.reflector}</dd>
        <dt>Wheel order</dt>
        <dd>{key.wheelOrder}</dd>
        <dt>Rings</dt>
        <dd className="letters">
          {key.rings.map((ring) => ringLetter(ring)).join(' ')} <span className="summary">(left and middle unknown)</span>
        </dd>
        <dt>Plugs</dt>
        <dd className="letters">{key.plugs.join(' ') || '—'}</dd>
        <dt>Message key</dt>
        <dd className="letters">{key.messageKey}</dd>
      </dl>
      {confirming ? (
        <p className="model-confirm" role="group" aria-label="Confirm Enigma setup">
          This replaces the Enigma setup.{' '}
          <button type="button" onClick={() => void setUp()}>
            Set up
          </button>{' '}
          <button type="button" onClick={() => setConfirming(false)}>
            Cancel
          </button>
        </p>
      ) : (
        <button type="button" onClick={() => setConfirming(true)}>
          Set up Enigma
        </button>
      )}
    </section>
  );
}

/** Checks the stop picked on the Stops view on the Hut 8 checking machine. */
export function CheckingView() {
  const check = useMachine((store) => store.check);
  const showBombeView = useMachine((store) => store.showBombeView);

  if (!check) {
    return (
      <div className="bombe-view">
        <p className="bombe-empty">No stop picked. Pick one on the Stops tab.</p>
        <button type="button" onClick={() => showBombeView('bombe-stops')}>
          Show stops
        </button>
      </div>
    );
  }

  return (
    <div className="bombe-view checking">
      <StopSummary check={check} />
      <CheckingMachine />
      <MenuLinks />
      <CribCheck check={check} />
      <SteckerGrid check={check} />
      <RightRing check={check} />
      <Suggestions />
      <section>
        <h3>Decrypt</h3>
        <pre className="check-decrypt" aria-label="Decrypt">
          {groups(check.decrypt)}
        </pre>
      </section>
      <Verdict check={check} />
      <CheckedKeyPanel check={check} />
    </div>
  );
}
