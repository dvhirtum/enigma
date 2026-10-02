import { useMemo, useRef, useState, type PointerEvent } from 'react';
import type { BombeMenu } from '../api';
import { drumLetters } from '../bombe/drums';
import { clamp, layoutMenu, lettersOf, parseLink, type Link, type Point } from '../bombe/menuLayout';
import { Hand } from '../notebook/paper';
import { useMachine } from '../store';
import { plural } from './letters';

const width = 640;
const height = 440;
const radius = 15;
/** How far apart links between the same two letters bow out, at their middle. */
const spread = 26;

/** Estimated stops, with one decimal below 10. */
export function formatStops(stops: number): string {
  const tenths = Math.round(stops * 10) / 10;
  return tenths < 10 ? tenths.toFixed(1) : Math.round(stops).toLocaleString('en-US');
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
 * Every link of the placed crib, sketched in pencil: plugged links drawn firmly, the others faint. Click a link to plug it
 * in or out, click a letter to put the test register on it, and drag letters to tidy the sketch.
 */
function MenuSketch({
  menu,
  busy,
  onToggle,
  onTestRegister,
}: {
  menu: BombeMenu;
  busy: boolean;
  onToggle: (link: string) => void;
  onTestRegister: (letter: string) => void;
}) {
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

  const linkClass = (link: Link) => (!plugged.has(link.id) ? 'sketch-link spare' : connected.has(link.id) ? 'sketch-link' : 'sketch-link loose');
  const letterClass = (letter: string) =>
    ['sketch-letter', !onMenu.has(letter) && 'spare', onMenu.has(letter) && !tested.has(letter) && 'loose', letter === menu.testRegister && 'test-register']
      .filter(Boolean)
      .join(' ');

  return (
    <svg ref={svg} className={busy ? 'menu-sketch busy' : 'menu-sketch'} viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Menu sketch">
      <defs>
        <filter id="pencil" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="8" />
          <feDisplacementMap in="SourceGraphic" scale="2.5" />
        </filter>
      </defs>
      {cribLinks.map((link) => {
        const path = paths.get(link.id)!;
        return (
          <g key={link.id} className={linkClass(link)} aria-hidden="true" onClick={() => onToggle(link.id)}>
            <path className="stroke" d={path.d} />
            <path className="hit" d={path.d} />
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
          aria-disabled={busy || !onMenu.has(letter)}
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
          <circle className="paper" cx={point.x} cy={point.y} r={radius} />
          <circle className="stroke" cx={point.x} cy={point.y} r={radius} />
          {letter === menu.testRegister && (
            <ellipse className="ring" cx={point.x} cy={point.y} rx={radius + 6} ry={radius + 4} transform={`rotate(-12 ${point.x} ${point.y})`} />
          )}
          <text x={point.x} y={point.y}>
            {letter}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** The size of the menu, its test register and the stops to expect. */
export function MenuSummary({ menu, diagonalBoard }: { menu: BombeMenu; diagonalBoard: boolean }) {
  const letters = lettersOf(menu.connectedLinks.map(parseLink)).length;
  const loose = menu.links.filter((link) => !menu.connectedLinks.includes(link));
  return (
    <section className="notebook-section" aria-label="Menu summary">
      <p aria-label="Menu size">
        {plural(menu.connectedLinks.length, 'link')}, {plural(letters, 'letter')}, {plural(menu.loops, 'loop')} · test register on{' '}
        <Hand>{menu.testRegister}</Hand>
      </p>
      <p aria-label="Estimated false stops">
        Expect <Hand>{formatStops(menu.stopsWithBoard)}</Hand> false stops per wheel order with the diagonal board,{' '}
        <Hand>{formatStops(menu.stopsWithoutBoard)}</Hand> without{diagonalBoard ? ' (the board is on)' : ' (the board is off)'}.
      </p>
      {loose.length > 0 && (
        <p className="notebook-warning" role="status">
          {loose.length === 1 ? '1 link is' : `${loose.length} links are`} not connected to the test register letter {menu.testRegister} and
          {loose.length === 1 ? ' tests' : ' test'} nothing: {loose.join(', ')}.
        </p>
      )}
    </section>
  );
}

/** The crib's links as a list of tick boxes, in crib order, each with its offset in drum letters. */
function LinkList({ menu, busy, onToggle }: { menu: BombeMenu; busy: boolean; onToggle: (link: string) => void }) {
  const plugged = new Set(menu.links);
  return (
    <fieldset className="sketch-links">
      <legend>Links</legend>
      {menu.cribLinks.map(parseLink).map((link) => (
        <label key={link.id} className={menu.connectedLinks.includes(link.id) ? undefined : plugged.has(link.id) ? 'loose' : 'spare'}>
          <input
            type="checkbox"
            aria-label={`Link ${link.first}–${link.second} at ${link.offset} (${drumLetters(link.offset)})`}
            checked={plugged.has(link.id)}
            disabled={busy || (plugged.has(link.id) && plugged.size === 1)}
            onChange={() => onToggle(link.id)}
          />
          <span className="offset">{link.offset}</span>
          <span className="hand">
            {link.first}–{link.second}
          </span>
          <span className="hand drums">{drumLetters(link.offset)}</span>
        </label>
      ))}
    </fieldset>
  );
}

/**
 * The menu of the placed crib: built when the crib is placed, and edited by hand here. The controls are locked while a
 * change is on its way to the backend. Sending the menu plugs up the Bombe, after asking when it was plugged by hand;
 * `onDone` follows.
 */
export function MenuStep({ onDone }: { onDone: () => void }) {
  const bombe = useMachine((store) => store.bombe);
  const setMenu = useMachine((store) => store.setMenu);
  const buildMenu = useMachine((store) => store.buildMenu);
  const plugUpMenu = useMachine((store) => store.plugUpMenu);
  const [asking, setAsking] = useState(false);
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const menu = bombe?.menu;
  if (!menu) {
    return null;
  }

  const send = (change: () => Promise<boolean>) => {
    if (pending.current) {
      return;
    }
    pending.current = true;
    setBusy(true);
    void change().finally(() => {
      pending.current = false;
      setBusy(false);
    });
  };

  const sendMenu = () => {
    setAsking(false);
    send(async () => {
      const plugged = await plugUpMenu();
      if (plugged) {
        onDone();
      }
      return plugged;
    });
  };

  const onToggle = (link: string) => {
    const links = menu.cribLinks.filter((own) => (own === link) !== menu.links.includes(own));
    if (links.length === 0) {
      return;
    }
    const keeps = links.some((own) => own.slice(0, 2).includes(menu.testRegister));
    send(() => setMenu(links, keeps ? menu.testRegister : undefined));
  };

  return (
    <div className="notebook-form" aria-busy={busy}>
      <p>
        Each crib letter and its cipher letter make a link, numbered by its place in the crib. Click a link to plug it in or out, and a letter to put the test
        register on it. Loops make a good menu.
      </p>
      <MenuSummary menu={menu} diagonalBoard={bombe.settings.diagonalBoard} />
      <MenuSketch
        key={menu.cribLinks.join(' ')}
        menu={menu}
        busy={busy}
        onToggle={onToggle}
        onTestRegister={(letter) => send(() => setMenu(menu.links, letter))}
      />
      <LinkList menu={menu} busy={busy} onToggle={onToggle} />
      <p className="notebook-actions">
        <button type="button" disabled={busy} onClick={() => send(buildMenu)}>
          Build menu again
        </button>
        <button type="button" disabled={busy || asking} onClick={() => (bombe.machine.pluggedByHand ? setAsking(true) : sendMenu())}>
          Send the menu to the Bombe
        </button>
      </p>
      {asking && (
        <p className="notebook-warning" role="alert">
          The Bombe is plugged up by hand. Pull out its cables and plug up this menu?{' '}
          <button type="button" onClick={sendMenu}>
            Plug up the menu
          </button>{' '}
          <button type="button" onClick={() => setAsking(false)}>
            Keep the Bombe as it is
          </button>
        </p>
      )}
    </div>
  );
}
