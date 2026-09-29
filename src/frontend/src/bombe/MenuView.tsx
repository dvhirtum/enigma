import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BombeMenu } from '../api';
import { useMachine } from '../store';
import { clamp, layoutMenu, lettersOf, parseLink, type Link, type Point } from './menuLayout';

const width = 640;
const height = 440;
const radius = 15;
/** How far apart links between the same two letters bow out, at their middle. */
const spread = 26;

/** The drum letters of an offset: its digits in base 26, with Z as 0 and A as 1 (1 = ZZA, 26 = ZAZ). */
export function drumLetters(offset: number): string {
  return [Math.floor(offset / 676), Math.floor(offset / 26), offset].map((digit) => String.fromCharCode(65 + ((digit + 25) % 26))).join('');
}

/** Estimated stops, with one decimal below 10. */
export function formatStops(stops: number): string {
  const tenths = Math.round(stops * 10) / 10;
  return tenths < 10 ? tenths.toFixed(1) : Math.round(stops).toLocaleString('en-US');
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The path of each link: straight, or bowed out when two letters share more than one link. Also the middle, for the offset. */
function linkPaths(links: Link[], at: Record<string, Point>): Map<string, { d: string; middle: Point }> {
  const byPair = new Map<string, Link[]>();
  for (const link of links) {
    const pair = [link.first, link.second].sort().join('');
    byPair.set(pair, [...(byPair.get(pair) ?? []), link]);
  }
  const paths = new Map<string, { d: string; middle: Point }>();
  for (const [pair, shared] of byPair) {
    const [a, b] = [at[pair[0]], at[pair[1]]];
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
    shared.forEach((link, i) => {
      const bow = (i - (shared.length - 1) / 2) * spread;
      const middle = { x: (a.x + b.x) / 2 + normal.x * bow, y: (a.y + b.y) / 2 + normal.y * bow };
      const control = { x: (a.x + b.x) / 2 + normal.x * bow * 2, y: (a.y + b.y) / 2 + normal.y * bow * 2 };
      paths.set(link.id, { d: `M${a.x},${a.y} Q${control.x},${control.y} ${b.x},${b.y}`, middle });
    });
  }
  return paths;
}

/**
 * Every link of the placed crib as a graph: plugged links solid, the others faded. Click a link to plug it in or out,
 * click a letter to put the test register on it, and drag letters to tidy the picture.
 */
function MenuGraph({ menu, onToggle, onTestRegister }: { menu: BombeMenu; onToggle: (link: string) => void; onTestRegister: (letter: string) => void }) {
  const cribLinks = useMemo(() => menu.cribLinks.map(parseLink), [menu.cribLinks]);
  const laidOut = useMemo(() => layoutMenu(cribLinks, width, height, 2 * radius), [cribLinks]);
  const [moved, setMoved] = useState<Record<string, Point>>({});
  const drag = useRef<{ letter: string; moved: boolean } | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const at = { ...laidOut, ...moved };
  const paths = linkPaths(cribLinks, at);
  const plugged = new Set(menu.links);
  const connected = new Set(menu.connectedLinks);
  const onMenu = new Set(lettersOf(menu.links.map(parseLink)));
  const tested = new Set(lettersOf(menu.connectedLinks.map(parseLink)));

  const toSvg = (event: PointerEvent): Point | null => {
    const matrix = svg.current?.getScreenCTM?.();
    if (!matrix) {
      return null;
    }
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: clamp(point.x, radius, width - radius), y: clamp(point.y, radius, height - radius) };
  };

  const onPointerDown = (letter: string) => (event: PointerEvent<SVGGElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    drag.current = { letter, moved: false };
  };

  const onPointerMove = (event: PointerEvent) => {
    const point = drag.current && toSvg(event);
    if (!drag.current || !point) {
      return;
    }
    const { letter } = drag.current;
    if (!drag.current.moved && Math.hypot(point.x - at[letter].x, point.y - at[letter].y) < 4) {
      return;
    }
    drag.current.moved = true;
    setMoved((current) => ({ ...current, [letter]: point }));
  };

  const onPointerUp = (letter: string) => () => {
    const dragged = drag.current?.moved;
    drag.current = null;
    if (!dragged && onMenu.has(letter) && letter !== menu.testRegister) {
      onTestRegister(letter);
    }
  };

  const linkClass = (link: Link) => (!plugged.has(link.id) ? 'menu-link spare' : connected.has(link.id) ? 'menu-link' : 'menu-link loose');
  const letterClass = (letter: string) =>
    ['menu-letter', !onMenu.has(letter) && 'spare', onMenu.has(letter) && !tested.has(letter) && 'loose', letter === menu.testRegister && 'test-register'].filter(Boolean).join(' ');

  return (
    <svg ref={svg} className="menu-graph" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Menu graph">
      {cribLinks.map((link) => {
        const path = paths.get(link.id)!;
        return (
          <g key={link.id} className={linkClass(link)} aria-hidden="true" onClick={() => onToggle(link.id)}>
            <path d={path.d} />
            <path className="hit" d={path.d} />
            <circle cx={path.middle.x} cy={path.middle.y} r={9} />
            <text x={path.middle.x} y={path.middle.y}>
              {link.offset}
            </text>
          </g>
        );
      })}
      {Object.entries(at).map(([letter, point]) => (
        <g
          key={letter}
          className={letterClass(letter)}
          role="button"
          tabIndex={onMenu.has(letter) ? 0 : -1}
          aria-label={`Letter ${letter}`}
          aria-pressed={letter === menu.testRegister}
          aria-disabled={!onMenu.has(letter)}
          onPointerDown={onPointerDown(letter)}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp(letter)}
          onPointerCancel={() => (drag.current = null)}
          onKeyDown={(event) => {
            if ((event.key === 'Enter' || event.key === ' ') && onMenu.has(letter) && letter !== menu.testRegister) {
              event.preventDefault();
              onTestRegister(letter);
            }
          }}
        >
          {letter === menu.testRegister && <circle className="ring" cx={point.x} cy={point.y} r={radius + 5} />}
          <circle cx={point.x} cy={point.y} r={radius} />
          <text x={point.x} y={point.y}>
            {letter}
          </text>
        </g>
      ))}
    </svg>
  );
}

function MenuSummary({ menu, diagonalBoard }: { menu: BombeMenu; diagonalBoard: boolean }) {
  const letters = lettersOf(menu.connectedLinks.map(parseLink)).length;
  const loose = menu.links.filter((link) => !menu.connectedLinks.includes(link));
  return (
    <div className="menu-summary">
      <p className="summary" aria-label="Menu size">
        {plural(menu.connectedLinks.length, 'link', 'links')}, {plural(letters, 'letter', 'letters')}, {plural(menu.loops, 'loop', 'loops')} · test register on{' '}
        {menu.testRegister}
      </p>
      <dl className="menu-stops">
        <dt>Estimated false stops per wheel order</dt>
        <dd>
          With the diagonal board: <strong>{formatStops(menu.stopsWithBoard)}</strong>
          {diagonalBoard && ' (on)'}
        </dd>
        <dd>
          Without: <strong>{formatStops(menu.stopsWithoutBoard)}</strong>
          {!diagonalBoard && ' (on)'}
        </dd>
      </dl>
      {loose.length > 0 && (
        <p className="menu-warning" role="status">
          {loose.length === 1 ? '1 link is' : `${loose.length} links are`} not connected to the test register letter {menu.testRegister} and
          {loose.length === 1 ? ' tests' : ' test'} nothing: {loose.join(', ')}.
        </p>
      )}
    </div>
  );
}

/** The crib's links as a list of switches, in crib order. */
function LinkList({ menu, onToggle }: { menu: BombeMenu; onToggle: (link: string) => void }) {
  const plugged = new Set(menu.links);
  return (
    <fieldset className="menu-links">
      <legend>Links</legend>
      {menu.cribLinks.map(parseLink).map((link) => (
        <label key={link.id} className={menu.connectedLinks.includes(link.id) ? undefined : plugged.has(link.id) ? 'loose' : 'spare'}>
          <input
            type="checkbox"
            aria-label={`Link ${link.first}–${link.second} at ${link.offset} (${drumLetters(link.offset)})`}
            checked={plugged.has(link.id)}
            disabled={plugged.has(link.id) && plugged.size === 1}
            onChange={() => onToggle(link.id)}
          />
          <span className="offset">{link.offset}</span>
          <span>
            {link.first}–{link.second}
          </span>
          <span className="drums">{drumLetters(link.offset)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/** The menu of the placed crib: built automatically when the crib is placed, and edited by hand here. */
export function MenuView() {
  const bombe = useMachine((store) => store.bombe);
  const setMenu = useMachine((store) => store.setMenu);
  const buildMenu = useMachine((store) => store.buildMenu);
  const menu = bombe?.menu;
  if (!menu) {
    return <p className="bombe-empty">Place the crib in the Crib view first.</p>;
  }

  const onToggle = (link: string) => {
    const links = menu.cribLinks.filter((own) => (own === link) !== menu.links.includes(own));
    if (links.length === 0) {
      return;
    }
    const keeps = links.some((own) => own.slice(0, 2).includes(menu.testRegister));
    void setMenu(links, keeps ? menu.testRegister : undefined);
  };

  return (
    <div className="bombe-view menu-view">
      <div className="crib-controls">
        <button type="button" onClick={() => void buildMenu()}>
          Build menu
        </button>
        <p className="summary">Click a link to plug it in or out, and a letter to put the test register on it.</p>
      </div>
      <MenuSummary menu={menu} diagonalBoard={bombe.settings.diagonalBoard} />
      <div className="menu-layout">
        <MenuGraph key={menu.cribLinks.join(' ')} menu={menu} onToggle={onToggle} onTestRegister={(letter) => void setMenu(menu.links, letter)} />
        <LinkList menu={menu} onToggle={onToggle} />
      </div>
    </div>
  );
}
