import { useState, type KeyboardEvent } from 'react';
import type { RotorState } from '../api';
import { drumRadius, drumWidth, RotorDrum } from '../components/RotorDrum';
import { greekRotors, reflectors, ringLetter, slots } from '../machine';
import { useMachine } from '../store';

const width = 880;
const height = 456;

const slotPitch = 112;
const drumY = 118;
const reflectorRadius = 72;

const boxTop = 276;
const cell = 64;
const boxPadding = 16;
const boxScale = 0.55;
const boxDrumY = boxTop + 72;
const boxGap = 16;

/** Rotor I–VIII, then Beta and Gamma on the M4. */
const rotorOrder = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', ...greekRotors];

function ringLabel(ringSetting: number): string {
  return `${String(ringSetting).padStart(2, '0')} ${ringLetter(ringSetting)}`;
}

function fits(slot: string, rotor: string): boolean {
  return (slot === 'Greek') === greekRotors.includes(rotor);
}

function isThin(reflector: string): boolean {
  return reflector.endsWith('-thin');
}

/** A reflector seen edge-on: a metal disc, thin on the M4. */
function ReflectorDisc({ reflector, x, y, scale = 1 }: { reflector: string; x: number; y: number; scale?: number }) {
  const discWidth = isThin(reflector) ? 20 : 34;
  return (
    <g className="reflector-disc" transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect className="reflector-hub" x={discWidth - 2} y={-18} width={14} height={36} rx={3} />
      <rect className="reflector-body" x={0} y={-reflectorRadius} width={discWidth} height={reflectorRadius * 2} rx={discWidth / 2.5} />
      <text className="reflector-letter" x={discWidth / 2} dy="0.35em">
        {reflector[0]}
      </text>
    </g>
  );
}

function Caption({ x, y, title, detail, muted }: { x: number; y: number; title: string; detail: string; muted?: boolean }) {
  return (
    <g className={muted ? 'caption muted' : 'caption'} aria-hidden="true">
      <text className="caption-title" x={x} y={y}>
        {title}
      </text>
      <text className="caption-detail" x={x} y={y + 16}>
        {detail}
      </text>
    </g>
  );
}

/** Remounts on a model switch, so a picked rotor does not carry over. */
export function OpenLidView() {
  const model = useMachine((store) => store.machine?.model);
  return <OpenLid key={model} />;
}

function OpenLid() {
  const machine = useMachine((store) => store.machine);
  const setReflector = useMachine((store) => store.setReflector);
  const insertRotor = useMachine((store) => store.insertRotor);
  const removeRotor = useMachine((store) => store.removeRotor);
  const stepRotor = useMachine((store) => store.stepRotor);
  const stepRing = useMachine((store) => store.stepRing);
  const [picked, setPicked] = useState<string | null>(null);

  if (!machine) {
    return null;
  }

  const machineSlots = slots[machine.model] ?? [];
  const inMachine = new Map(machine.rotors.map((rotor) => [rotor.rotor, rotor]));
  const inBox = new Map(machine.rotorBox.map((rotor) => [rotor.rotor, rotor]));
  const compartments = rotorOrder.filter((rotor) => inMachine.has(rotor) || inBox.has(rotor));
  const pick = picked !== null && inBox.has(picked) ? picked : null;

  const place = (slot: string) => {
    if (pick && fits(slot, pick)) {
      setPicked(null);
      void insertRotor(slot, pick);
    }
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setPicked(null);
    }
  };

  // The machine: reflector, rotor slots and entry wheel, centred in the case.
  const stackWidth = 64 + machineSlots.length * slotPitch + 56;
  const stackX = (width - stackWidth) / 2;
  const slotX = (index: number) => stackX + 64 + index * slotPitch + (slotPitch - drumWidth) / 2;
  const etwX = stackX + 64 + machineSlots.length * slotPitch + 8;

  const slotView = (slot: string, index: number) => {
    const rotor = machine.rotors.find((current) => current.slot === slot);
    const x = slotX(index);
    const target = pick !== null && fits(slot, pick);
    const centre = x + drumWidth / 2;
    return (
      <g key={slot}>
        {rotor ? (
          <RotorDrum
            letter={rotor.position}
            name={rotor.rotor}
            label={`${slot} slot: rotor ${rotor.rotor}, ring ${ringLabel(rotor.ringSetting)}`}
            valueText={rotor.position}
            className={target ? 'target' : undefined}
            x={x}
            y={drumY}
            onTurn={(steps) => void stepRotor(slot, steps)}
            onActivate={() => (pick ? place(slot) : void removeRotor(slot))}
          />
        ) : (
          <g
            className={target ? 'empty-slot target' : 'empty-slot'}
            transform={`translate(${x} ${drumY})`}
            role="button"
            aria-label={`${slot} slot: empty`}
            aria-disabled={!target}
            tabIndex={0}
            onClick={() => place(slot)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                place(slot);
              }
            }}
          >
            <rect x={-8} y={-drumRadius - 6} width={drumWidth + 16} height={drumRadius * 2 + 12} rx={10} />
          </g>
        )}
        <Caption
          x={centre}
          y={drumY + drumRadius + 30}
          title={slot}
          detail={rotor ? `${rotor.rotor} · ring ${ringLabel(rotor.ringSetting)}` : 'empty'}
          muted={!rotor}
        />
      </g>
    );
  };

  // The boxes: reflector box on the left, below the reflector, and rotor box on the right.
  const modelReflectors = reflectors[machine.model] ?? [];
  const rotorBoxWidth = compartments.length * cell + boxPadding * 2;
  const reflectorBoxWidth = modelReflectors.length * cell + boxPadding * 2;
  const reflectorBoxX = (width - reflectorBoxWidth - boxGap - rotorBoxWidth) / 2;
  const rotorBoxX = reflectorBoxX + reflectorBoxWidth + boxGap;
  const boxHeight = height - boxTop - 8;
  const cellX = (boxX: number, index: number) => boxX + boxPadding + index * cell;

  const box = (x: number, boxWidth: number, label: string, cells: number) => (
    <g aria-hidden="true">
      <rect className="wood" x={x} y={boxTop} width={boxWidth} height={boxHeight} rx={6} />
      <rect className="felt" x={x + 10} y={boxTop + 10} width={boxWidth - 20} height={boxHeight - 20} rx={3} />
      {Array.from({ length: cells - 1 }, (_, index) => (
        <rect key={index} className="divider" x={cellX(x, index + 1) - 2} y={boxTop + 10} width={4} height={boxHeight - 64} />
      ))}
      <rect className="box-plate" x={x + boxWidth / 2 - 34} y={boxTop - 8} width={68} height={16} rx={2} />
      <text className="box-plate-text" x={x + boxWidth / 2} y={boxTop} dy="0.35em">
        {label}
      </text>
    </g>
  );

  const compartment = (rotorName: string, index: number) => {
    const x = cellX(rotorBoxX, index);
    const centre = x + cell / 2;
    const boxed: RotorState | undefined = inBox.get(rotorName);
    const inserted = inMachine.get(rotorName);
    const isPicked = pick === rotorName;
    return (
      <g key={rotorName}>
        {boxed ? (
          <RotorDrum
            letter={ringLetter(boxed.ringSetting)}
            name={rotorName}
            label={`Rotor ${rotorName} in the box, ring${isPicked ? ', picked' : ''}`}
            valueText={ringLabel(boxed.ringSetting)}
            className={isPicked ? 'picked' : undefined}
            x={centre - (drumWidth * boxScale) / 2}
            y={boxDrumY - (isPicked ? 8 : 0)}
            scale={boxScale}
            onTurn={(steps) => void stepRing(rotorName, steps)}
            onActivate={() => setPicked(isPicked ? null : rotorName)}
          />
        ) : (
          <g role="img" aria-label={`Rotor ${rotorName} is in the ${inserted?.slot} slot`}>
            <text className="compartment-note" x={centre} y={boxDrumY} dy="0.35em">
              {inserted?.slot}
            </text>
          </g>
        )}
        <Caption
          x={centre}
          y={boxTop + boxHeight - 32}
          title={rotorName}
          detail={boxed ? ringLabel(boxed.ringSetting) : 'in machine'}
          muted={!boxed}
        />
      </g>
    );
  };

  const reflectorCompartment = (reflector: string, index: number) => {
    const x = cellX(reflectorBoxX, index);
    const centre = x + cell / 2;
    const fitted = reflector === machine.reflector;
    const discWidth = (isThin(reflector) ? 20 : 34) * boxScale;
    return (
      <g key={reflector}>
        {fitted ? (
          <g role="img" aria-label={`Reflector ${reflector} is in the machine`}>
            <text className="compartment-note" x={centre} y={boxDrumY} dy="0.35em">
              UKW
            </text>
          </g>
        ) : (
          <g
            className="spare-reflector"
            role="button"
            aria-label={`Fit reflector ${reflector}`}
            tabIndex={0}
            onClick={() => void setReflector(reflector)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                void setReflector(reflector);
              }
            }}
          >
            <rect className="spare-reflector-area" x={x + 4} y={boxTop + 14} width={cell - 8} height={boxHeight - 72} rx={6} />
            <ReflectorDisc reflector={reflector} x={centre - discWidth / 2} y={boxDrumY} scale={boxScale} />
          </g>
        )}
        <Caption x={centre} y={boxTop + boxHeight - 32} title={reflector} detail={fitted ? 'in machine' : 'spare'} muted={fitted} />
      </g>
    );
  };

  return (
    <section className="open-lid" aria-label="Open lid" onKeyDown={onKeyDown}>
      <svg className="machine" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="drum-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4a4843" />
            <stop offset="45%" stopColor="#e7e4dc" />
            <stop offset="55%" stopColor="#f3f1ea" />
            <stop offset="100%" stopColor="#4a4843" />
          </linearGradient>
          <linearGradient id="drum-dark" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141412" />
            <stop offset="50%" stopColor="#5d5a53" />
            <stop offset="100%" stopColor="#141412" />
          </linearGradient>
        </defs>

        <g role="group" aria-label="Machine">
          <rect className="wood" x={stackX - 30} y={8} width={stackWidth + 60} height={252} rx={10} />
          <rect className="case" x={stackX - 18} y={20} width={stackWidth + 36} height={228} rx={4} />
          <rect className="axle" x={stackX} y={drumY - 5} width={stackWidth} height={10} aria-hidden="true" />

          <g role="img" aria-label={`Reflector ${machine.reflector}`}>
            <ReflectorDisc reflector={machine.reflector} x={stackX + 16} y={drumY} />
          </g>
          <Caption x={stackX + 30} y={drumY + drumRadius + 30} title="UKW" detail={machine.reflector} />

          {machineSlots.map(slotView)}

          <g className="entry-wheel" transform={`translate(${etwX} ${drumY})`} aria-hidden="true">
            <rect className="entry-wheel-body" x={0} y={-58} width={30} height={116} rx={8} />
            <rect className="entry-wheel-rim" x={24} y={-40} width={14} height={80} rx={4} />
          </g>
          <Caption x={etwX + 18} y={drumY + drumRadius + 30} title="ETW" detail="" />
        </g>

        <g role="group" aria-label="Reflector box">
          {box(reflectorBoxX, reflectorBoxWidth, 'UKW', modelReflectors.length)}
          {modelReflectors.map(reflectorCompartment)}
        </g>

        <g role="group" aria-label="Rotor box">
          {box(rotorBoxX, rotorBoxWidth, 'Walzen', compartments.length)}
          {compartments.map(compartment)}
        </g>
      </svg>
      <p className="hint" role="status">
        {pick
          ? `Rotor ${pick} is picked. Click a highlighted slot to put it in, or press Escape.`
          : 'Click a rotor in the box, then a slot. Click a rotor in the machine to put it back. Scroll over a rotor to turn it.'}
      </p>
    </section>
  );
}
