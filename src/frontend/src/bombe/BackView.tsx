import { useState } from 'react';
import type { BombeState } from '../api';
import { useMachine } from '../store';
import { scramblersOf, slotsOf } from './drums';
import { isActive } from './FrontView';
import { lettersOf } from './menuLayout';

const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const margin = 24;
const jackPitch = 27;
const boardY = 40;
const commonY = 150;
const bankY = 250;
const bankHeight = 70;
const columns = 12;
const pitch = (alphabet.length * jackPitch) / columns;
const width = 2 * margin + alphabet.length * jackPitch + 130;
const height = bankY + 3 * bankHeight;
const registerX = 2 * margin + alphabet.length * jackPitch + 50;

const jackX = (letter: string) => margin + (letter.charCodeAt(0) - 65) * jackPitch + jackPitch / 2;

/** A cable from a scrambler jack up to its letter's common. */
function cable(x: number, y: number, letter: string): string {
  const to = jackX(letter);
  return `M${x},${y} C${x},${y - 60} ${to},${commonY + 60} ${to},${commonY}`;
}

/**
 * The back of the Bombe, as plugged up for the menu once per copy: each scrambler's two jacks cabled to the commons of its letters,
 * the commons cabled to the diagonal board, and the test register on the test register letter's common.
 */
function Back({ bombe }: { bombe: BombeState }) {
  const menu = bombe.menu;
  const scramblers = scramblersOf(menu?.links ?? []);
  const slots = new Map(slotsOf(bombe).map((slot) => [slot.slot, slot]));
  const letters = new Set(lettersOf(scramblers));
  const board = bombe.settings.diagonalBoard;

  return (
    <svg className="bombe-back" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Back of the Bombe">
      <g className={board ? 'diagonal-board' : 'diagonal-board off'} role="img" aria-label={`Diagonal board ${board ? 'on' : 'off'}`}>
        <rect x={margin - 6} y={boardY - 28} width={alphabet.length * jackPitch + 12} height={44} rx={4} />
        <text className="panel-label" x={margin} y={boardY - 16}>
          Diagonal board
        </text>
        {alphabet.map((letter) => (
          <g key={letter} className="jack">
            <circle cx={jackX(letter)} cy={boardY + 4} r={8} />
            <text x={jackX(letter)} y={boardY + 4}>
              {letter}
            </text>
          </g>
        ))}
      </g>
      {[...letters].map((letter) => (
        <g key={letter} className="common" role="img" aria-label={`Common ${letter}`}>
          <line className={board ? 'board-cable' : 'board-cable off'} x1={jackX(letter)} y1={boardY + 10} x2={jackX(letter)} y2={commonY - 10} />
          <rect x={jackX(letter) - 10} y={commonY - 10} width={20} height={20} rx={3} />
          <text x={jackX(letter)} y={commonY}>
            {letter}
          </text>
        </g>
      ))}
      {menu && letters.has(menu.testRegister) && (
        <g className="test-register" role="img" aria-label={`Test register on ${menu.testRegister}, input ${bombe.settings.input}`}>
          <path className="cable" d={`M${jackX(menu.testRegister)},${commonY + 10} C${jackX(menu.testRegister)},${commonY + 50} ${registerX - 90},${commonY + 50} ${registerX - 40},${commonY}`} />
          <rect x={registerX - 40} y={commonY - 30} width={100} height={60} rx={4} />
          <text className="panel-label" x={registerX - 34} y={commonY - 14}>
            Test register
          </text>
          <text x={registerX + 10} y={commonY + 8}>
            {menu.testRegister} · input {bombe.settings.input}
          </text>
        </g>
      )}
      {Array.from({ length: 3 * columns }, (_, index) => {
        const x = margin + (index % columns) * pitch + pitch / 2;
        const y = bankY + Math.floor(index / columns) * bankHeight + 20;
        const link = slots.get(index);
        return (
          <g
            key={index}
            className={link ? 'scrambler-jacks' : 'scrambler-jacks empty'}
            role={link ? 'img' : undefined}
            aria-label={link ? `Copy ${link.copy + 1} scrambler ${index + 1} jacks ${link.first} and ${link.second}` : undefined}
            aria-hidden={link ? undefined : true}
          >
            {link && <path className="cable" d={cable(x - 8, y, link.first)} />}
            {link && <path className="cable" d={cable(x + 8, y, link.second)} />}
            <rect x={x - 17} y={y - 8} width={34} height={30} rx={3} />
            <circle cx={x - 8} cy={y} r={5} />
            <circle cx={x + 8} cy={y} r={5} />
            {link && (
              <text x={x} y={y + 15}>
                {link.first}
                {link.second}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** The back of the Bombe: the cables of the menu, the diagonal board switch and the input letter. */
export function BackView() {
  const bombe = useMachine((store) => store.bombe);
  const configureBombe = useMachine((store) => store.configureBombe);
  const [busy, setBusy] = useState(false);
  if (!bombe) {
    return null;
  }
  const disabled = busy || isActive(bombe.run);

  const send = (change: Promise<boolean>) => {
    setBusy(true);
    void change.finally(() => setBusy(false));
  };

  return (
    <div className="bombe-view back-view">
      <div className="crib-controls">
        <label>
          <input
            type="checkbox"
            checked={bombe.settings.diagonalBoard}
            disabled={disabled}
            onChange={(event) => send(configureBombe({ diagonalBoard: event.target.checked }))}
          />
          Diagonal board
        </label>
        <label>
          Input on wire{' '}
          <select value={bombe.settings.input} disabled={disabled} onChange={(event) => send(configureBombe({ input: event.target.value }))}>
            {alphabet.map((letter) => (
              <option key={letter}>{letter}</option>
            ))}
          </select>
        </label>
        {bombe.menu && <p className="summary">of the test register cable {bombe.menu.testRegister}.</p>}
      </div>
      {!bombe.menu && <p className="bombe-empty">Draw a menu in the Hut 8 notebook to plug up the Bombe.</p>}
      <Back bombe={bombe} />
    </div>
  );
}
