import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { BombeCheck, BombeMenu, BombeState } from '../api';
import { isActive } from '../bombe/FrontView';
import { ErrorToast } from '../ErrorToast';
import { useMachine } from '../store';
import { CheckStep, CheckSummary, KeyStep, KeySummary } from './CheckStep';
import { CribStep, CribSummary } from './CribStep';
import { IndicatorsStep, IndicatorsSummary, NoIndicators, TrafficStep, canReadIndicators } from './IndicatorSteps';
import { plural } from './letters';
import { MenuStep, MenuSummary } from './MenuStep';
import { MessageStep, MessageSummary } from './MessageStep';
import { RunReport, RunStep, StopLine, StopsStep } from './RunStep';

const steps = [
  { id: 'message', title: 'Choose the message' },
  { id: 'crib', title: 'Place the crib' },
  { id: 'menu', title: 'Draw the menu' },
  { id: 'run', title: 'Run the Bombe' },
  { id: 'stop', title: 'Choose a stop' },
  { id: 'check', title: 'Check the stop' },
  { id: 'key', title: 'Read the message' },
  { id: 'indicators', title: 'Read the indicators' },
  { id: 'traffic', title: "Read the day's traffic" },
] as const;

type StepId = (typeof steps)[number]['id'];

const menuKey = (menu: BombeMenu | null) => (menu ? `${menu.links.join(' ')} ${menu.testRegister}` : null);

/** What a step holds; a reopened step closes when it changes. */
function signatureOf(step: StepId, bombe: BombeState, check: BombeCheck | null): string {
  switch (step) {
    case 'message':
      return `${bombe.source?.title} ${bombe.cipherText}`;
    case 'crib':
      return `${bombe.crib} ${bombe.position}`;
    case 'menu':
      return menuKey(bombe.menu) ?? '';
    case 'run':
      return `${bombe.run?.status} ${bombe.stops}`;
    case 'stop':
      return String(check?.stop.index);
    case 'check':
      return String(check?.verdict);
    case 'key':
      return String(bombe.day?.grundstellung);
    case 'indicators':
      return `${check?.reading?.left} ${check?.reading?.middle}`;
    case 'traffic':
      return '';
  }
}

/** Which steps are done, from the job, the open check and what was marked done in this window. */
function doneSteps(bombe: BombeState, check: BombeCheck | null, menuSent: boolean, leftRun: boolean, leftKey: boolean): Record<StepId, boolean> {
  return {
    message: bombe.source !== null,
    crib: bombe.position !== null && bombe.menu !== null,
    menu: menuSent || bombe.run !== null || bombe.stops > 0,
    run: bombe.stops > 0 && (!isActive(bombe.run) || leftRun),
    stop: check !== null && check.verdict !== 'False',
    check: check?.verdict === 'True',
    key: check?.verdict === 'True' && (leftKey || bombe.day !== null),
    indicators: check?.reading?.fitsStop === true && check.reading.middleRingFits,
    traffic: false,
  };
}

/** What a finished step leaves written in the notebook. */
function Summary({ step, bombe, check }: { step: StepId; bombe: BombeState; check: BombeCheck | null }) {
  switch (step) {
    case 'message':
      return <MessageSummary />;
    case 'crib':
      return <CribSummary />;
    case 'menu':
      return bombe.menu && <MenuSummary menu={bombe.menu} diagonalBoard={bombe.settings.diagonalBoard} />;
    case 'run':
      return bombe.run ? <RunReport run={bombe.run} /> : <p>{plural(bombe.stops, 'stop')} found.</p>;
    case 'stop':
      return check && <StopLine stop={check.stop} />;
    case 'check':
      return check && <CheckSummary check={check} />;
    case 'key':
      return check && <KeySummary check={check} />;
    case 'indicators':
      return check && <IndicatorsSummary check={check} />;
    case 'traffic':
      return null;
  }
}

/**
 * The Hut 8 notebook: walks through breaking a message, from the crib to the key, while the Bombe and the checking
 * machine are worked in the machine window. A finished step can be reopened; changing it clears the steps after it.
 */
export function Hut8Notebook() {
  const loadBombe = useMachine((store) => store.loadBombe);
  const bombe = useMachine((store) => store.bombe);
  const check = useMachine((store) => store.check);
  const [sentMenu, setSentMenu] = useState<string | null>(null);
  const [leftRun, setLeftRun] = useState(false);
  const [leftKey, setLeftKey] = useState<number | null>(null);
  const [reopened, setReopened] = useState<{ step: StepId; signature: string } | null>(null);
  const currentRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    void loadBombe();
  }, [loadBombe]);

  // Leaving a run to check its stops, and leaving a stop's message to read the indicators, last until the stops are cleared.
  if (leftRun && bombe?.stops === 0) {
    setLeftRun(false);
  }
  if (leftKey !== null && bombe?.stops === 0) {
    setLeftKey(null);
  }

  // A reopened step closes once it changes; the steps after it follow from the job again.
  const changed = reopened !== null && bombe !== null && signatureOf(reopened.step, bombe, check) !== reopened.signature;
  if (changed) {
    setReopened(null);
  }

  // A message whose indicators cannot be read ends with reading it.
  const shown = bombe && !canReadIndicators(bombe) ? steps.filter((step) => step.id !== 'indicators' && step.id !== 'traffic') : steps;
  const done = bombe && doneSteps(bombe, check, sentMenu !== null && sentMenu === menuKey(bombe.menu), leftRun, leftKey === check?.stop.index);
  const firstOpen = done ? shown.findIndex((step) => !done[step.id]) : 0;
  const current = reopened && !changed ? shown.findIndex((step) => step.id === reopened.step) : firstOpen;

  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
  }, [current]);

  const content = (step: StepId): ReactNode => {
    if (!bombe) {
      return null;
    }
    switch (step) {
      case 'message':
        return <MessageStep />;
      case 'crib':
        return <CribStep />;
      case 'menu':
        return (
          <MenuStep
            onDone={() => {
              setSentMenu(menuKey(bombe.menu));
              setReopened(null);
            }}
          />
        );
      case 'run':
        return <RunStep onDone={() => setLeftRun(true)} />;
      case 'stop':
        return <StopsStep />;
      case 'check':
        return check && <CheckStep check={check} />;
      case 'key':
        return (
          check && (
            <>
              <KeyStep check={check} />
              {canReadIndicators(bombe) ? (
                <p className="notebook-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setLeftKey(check.stop.index);
                      setReopened(null);
                    }}
                  >
                    Read the indicators
                  </button>
                </p>
              ) : (
                <NoIndicators />
              )}
            </>
          )
        );
      case 'indicators':
        return check && <IndicatorsStep check={check} />;
      case 'traffic':
        return check && <TrafficStep check={check} />;
    }
  };

  return (
    <div className="notebook hut8">
      <ErrorToast className="notebook-error" />
      <section className="page" aria-label="Hut 8 notebook">
        <p className="page-key">Hut 8 · Naval Enigma</p>
        {!bombe ? (
          <p role="status">Opening the notebook...</p>
        ) : (
          <ol className="steps" aria-label="Steps">
            {shown.map((step, index) => {
              const isCurrent = index === current;
              const isDone = index < current;
              return (
                <li
                  key={step.id}
                  ref={isCurrent ? currentRef : undefined}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-labelledby={`step-${step.id}`}
                  data-done={isDone ? '' : undefined}
                >
                  <h3 id={`step-${step.id}`} className="step-title">
                    {step.title}
                  </h3>
                  {isDone && (
                    <>
                      <Summary step={step.id} bombe={bombe} check={check} />
                      <p className="notebook-actions">
                        <button
                          type="button"
                          aria-label={`Change: ${step.title}`}
                          onClick={() => setReopened({ step: step.id, signature: signatureOf(step.id, bombe, check) })}
                        >
                          Change
                        </button>
                      </p>
                    </>
                  )}
                  {isCurrent && content(step.id)}
                  {isCurrent && reopened && (
                    <p className="notebook-actions">
                      <button type="button" onClick={() => setReopened(null)}>
                        Keep as it is
                      </button>
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
