import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import type { BombeCheck, BombeState, DayTraffic } from '../api';
import { useMachine } from '../store';
import { carterBombe, carterChecked, carterMenu, carterRead, fakeDay, generatedSheet, summaryOf } from '../test/fakeApi';
import { renderBombe } from '../test/renderBombe';
import { IndicatorsStep, NoIndicators, TrafficStep } from './IndicatorSteps';

const exercise: BombeState = {
  ...carterMenu,
  source: { ...carterBombe.source!, kind: 'Exercise', title: 'Exercise, 19 June 1944', message: fakeDay.messages[0].message },
};

const trueCheck: BombeCheck = { ...carterChecked, verdict: 'True' };

const withVerfahrenkenngruppe: DayTraffic = {
  ...fakeDay,
  messages: [{ ...fakeDay.messages[0], verfahrenkenngruppe: 'ABC', verfahrenkenngruppeRight: true }, ...fakeDay.messages.slice(1)],
};

/** Opens the check of Carter's true stop and shows `step` for it. */
function OpenCheck({ step }: { step: 'indicators' | 'traffic' }) {
  const openCheck = useMachine((store) => store.openCheck);
  const check = useMachine((store) => store.check);
  useEffect(() => {
    void openCheck(0);
  }, [openCheck]);
  if (!check) {
    return null;
  }
  return step === 'indicators' ? <IndicatorsStep check={check} /> : <TrafficStep check={check} />;
}

function renderStep(step: 'indicators' | 'traffic', state: BombeState, check: BombeCheck = trueCheck) {
  return renderBombe(<OpenCheck step={step} />, { ...state, stops: 2 }, (api) => api.bombe.getCheck.mockResolvedValue({ ok: true, value: check }));
}

describe('IndicatorsStep', () => {
  it('takes the pinch of an exercise', async () => {
    const api = renderStep('indicators', exercise);

    fireEvent.click(await screen.findByRole('button', { name: 'Take the pinch' }));

    await waitFor(() => expect(api.bombe.takePinch).toHaveBeenCalledWith(undefined, undefined));
  });

  it('takes the pinch of the key sheet day chosen for a pasted message', async () => {
    const pasted: BombeState = { ...exercise, source: { ...exercise.source!, kind: 'Pasted' } };
    const api = renderStep('indicators', pasted);
    api.keySheets.list.mockResolvedValue({ ok: true, value: [summaryOf({ ...generatedSheet, id: 'm3', model: 'M3' })] });
    const form = await screen.findByRole('form', { name: 'Day of the pinch' });
    await within(form).findByRole('option', { name: 'June 1944' });
    expect(within(form).getByRole('button', { name: 'Take the pinch' })).toBeDisabled();

    fireEvent.change(within(form).getByRole('combobox', { name: 'Key sheet' }), { target: { value: 'm3' } });
    fireEvent.change(within(form).getByRole('spinbutton', { name: 'Day' }), { target: { value: '19' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Take the pinch' }));

    await waitFor(() => expect(api.bombe.takePinch).toHaveBeenCalledWith('m3', 19));
  });

  it('shows the pinch and writes down the groups read from the indicator', async () => {
    const api = renderStep('indicators', { ...exercise, day: fakeDay });

    expect(await screen.findByRole('group', { name: 'Grundstellung' })).toHaveTextContent('QRS');
    expect(screen.getByRole('table', { name: 'Tauschtafel 3' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Upper indicator group' })).toHaveTextContent('QWTZ');
    fireEvent.change(screen.getByRole('textbox', { name: 'Verfahrenkenngruppe' }), { target: { value: 'ab' } });
    fireEvent.change(screen.getByRole('textbox', { name: 'Verfahrenkenngruppe' }), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Fill in' }));

    await waitFor(() => expect(api.bombe.fillInIndicator).toHaveBeenCalledWith(0));
    expect(api.bombe.writeIndicator).toHaveBeenCalledTimes(1);
    expect(api.bombe.writeIndicator).toHaveBeenCalledWith(0, { verfahrenkenngruppe: 'ABC' });
    expect(screen.queryByRole('region', { name: 'Ring table' })).not.toBeInTheDocument();
  });

  it('highlights the row and column labels of the Tauschtafel square under the mouse', async () => {
    renderStep('indicators', { ...exercise, day: fakeDay });
    const table = await screen.findByRole('table', { name: 'Tauschtafel 3' });
    const row = within(table).getByRole('rowheader', { name: 'C' });
    const column = within(table).getByRole('columnheader', { name: 'F' });

    fireEvent.mouseEnter(within(row.closest('tr')!).getAllByRole('cell')[5]);

    expect(row).toHaveClass('hovered');
    expect(column).toHaveClass('hovered');
    expect(within(table).getByRole('rowheader', { name: 'D' })).not.toHaveClass('hovered');

    fireEvent.mouseLeave(table);

    expect(row).not.toHaveClass('hovered');
    expect(column).not.toHaveClass('hovered');
  });

  it('marks a wrong group', async () => {
    const day: DayTraffic = { ...fakeDay, messages: [{ ...fakeDay.messages[0], verfahrenkenngruppe: 'XYZ', verfahrenkenngruppeRight: false }] };
    renderStep('indicators', { ...exercise, day });

    expect(await screen.findByRole('textbox', { name: 'Verfahrenkenngruppe' })).toHaveValue('XYZ');
    expect(screen.getByLabelText('wrong')).toBeInTheDocument();
  });

  it('reads the rings off the ring table once the Verfahrenkenngruppe is right', async () => {
    const api = renderStep('indicators', { ...exercise, day: withVerfahrenkenngruppe });

    const table = await screen.findByRole('region', { name: 'Ring table' });
    expect(within(table).getByRole('group', { name: "Stop's indicator" })).toHaveTextContent('DKX');
    fireEvent.click(within(table).getByRole('button', { name: 'Rings C N: Spruchschlüssel ULA, indicator DKX' }));

    await waitFor(() => expect(api.bombe.readRings).toHaveBeenCalledWith(0, 3, 14));
    expect(api.bombe.getRingTable).toHaveBeenCalledWith(0);
  });

  it('shows the whole key and the decrypt once the rings are read', async () => {
    renderStep('indicators', { ...exercise, day: withVerfahrenkenngruppe }, carterRead);

    const key = await screen.findByRole('region', { name: 'Key' });
    expect(key).toHaveTextContent('C N Z');
    expect(key).toHaveTextContent('These are the rings of the key sheet.');
    expect(within(key).getByRole('group', { name: 'Decrypt with the whole key' })).toHaveTextContent('WETT ERVO');
    expect(await screen.findByRole('button', { name: 'Rings C N: Spruchschlüssel ULA, indicator DKX', pressed: true })).toBeInTheDocument();
  });
});

describe('NoIndicators', () => {
  it('gives the published rings of an intercept', async () => {
    renderBombe(<NoIndicators />, carterBombe);

    expect(await screen.findByText(/Its published rings are/)).toHaveTextContent('C N Z');
  });

  it('asks for the radio message when only cipher text is loaded', async () => {
    renderBombe(<NoIndicators />, { ...carterBombe, source: { ...carterBombe.source!, kind: 'Pasted', hasSolution: false } });

    expect(await screen.findByText(/Bare cipher text has no indicator/)).toBeInTheDocument();
  });
});

describe('TrafficStep', () => {
  it('lists the other messages of the day with their indicators', async () => {
    const api = renderStep('traffic', { ...exercise, day: fakeDay }, carterRead);

    const messages = await screen.findByRole('list', { name: 'Messages of the day' });
    expect(within(messages).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(within(within(messages).getByRole('listitem', { name: 'Message 2' })).getByRole('button', { name: 'Fill in' }));

    await waitFor(() => expect(api.bombe.fillInIndicator).toHaveBeenCalledWith(2));
  });

  it('sets up the Enigma with the whole key at the Grundstellung after asking', async () => {
    const api = renderStep('traffic', { ...exercise, day: fakeDay }, carterRead);

    fireEvent.click(await screen.findByRole('button', { name: 'Set up Enigma at the Grundstellung' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));

    await waitFor(() =>
      expect(api.machine.setUpMachine).toHaveBeenCalledWith({
        reflector: 'B',
        rotors: ['II', 'V', 'III'],
        rings: [3, 14, 26],
        plugs: carterRead.key.plugs,
        positions: 'QRS',
      }),
    );
    expect(api.windows.showMode).toHaveBeenCalledWith('enigma');
  });
});
