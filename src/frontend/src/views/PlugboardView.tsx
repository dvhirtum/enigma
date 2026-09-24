import { useRef, useState, type KeyboardEvent } from 'react';
import { plugHeight, PlugSocket } from '../components/PlugSocket';
import { usePlugDrag, type Point } from '../components/usePlugDrag';
import { keyboardRows } from '../machine';
import { useMachine } from '../store';

const maxCables = 13;
const width = 640;
const height = 420;
const pitch = 62;
const rowsY = [70, 160, 250];

const sockets = new Map<string, Point>(
  keyboardRows.flatMap((row, rowIndex) =>
    [...row].map((letter, index): [string, Point] => [letter, { x: width / 2 + (index - (row.length - 1) / 2) * pitch, y: rowsY[rowIndex] }]),
  ),
);

/** The partner of each plugged letter. */
function partners(plugs: string[]): Map<string, string> {
  return new Map(plugs.flatMap(([a, b]) => [[a, b], [b, a]] as const));
}

/** A cable hanging between the bottoms of two plugs. */
function Cable({ from, to }: { from: Point; to: Point }) {
  const x1 = from.x;
  const y1 = from.y + plugHeight / 2;
  const x2 = to.x;
  const y2 = to.y + plugHeight / 2;
  const sag = Math.max(y1, y2) + 30 + Math.abs(x2 - x1) * 0.2;
  return <path className="cable" d={`M ${x1} ${y1} C ${x1} ${sag} ${x2} ${sag} ${x2} ${y2}`} />;
}

export function PlugboardView() {
  const machine = useMachine((store) => store.machine);
  const connectPlug = useMachine((store) => store.connectPlug);
  const disconnectPlug = useMachine((store) => store.disconnectPlug);
  const [selected, setSelected] = useState<string | null>(null);
  const svg = useRef<SVGSVGElement>(null);

  const plugs = machine?.plugs ?? [];
  const partner = partners(plugs);

  /** Picks a free socket as the first cable end, connects it to the second, or removes a plugged cable. */
  const activate = (letter: string) => {
    const first = selected && !partner.has(selected) ? selected : null;
    if (partner.has(letter)) {
      setSelected(null);
      void disconnectPlug(letter);
    } else if (first && first !== letter) {
      setSelected(null);
      void connectPlug(first + letter);
    } else {
      setSelected(first === letter ? null : letter);
    }
  };

  /** Connects a free socket, moves a plug end to a free socket, or removes a cable dropped off the sockets. */
  const drop = async (from: string, to: string | null) => {
    const other = partner.get(from);
    const free = to !== null && to !== from && !partner.has(to);
    if (!other) {
      if (free) {
        await connectPlug(from + to);
      }
    } else if (to === null) {
      await disconnectPlug(from);
    } else if (free && (await disconnectPlug(from))) {
      await connectPlug(other + to);
    }
  };

  const { drag, grab } = usePlugDrag(svg, activate, (from, to) => {
    setSelected(null);
    void drop(from, to);
  });

  if (!machine) {
    return null;
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setSelected(null);
    }
  };

  const loose = drag?.point ?? null;
  const dragged = loose ? drag?.from : undefined;
  const loosePlug = dragged && (partner.get(dragged) ?? dragged);

  return (
    <section className="plugboard" aria-label="Plugboard">
      <svg ref={svg} className="machine" viewBox={`0 0 ${width} ${height}`} role="group" aria-label="Sockets" onKeyDown={onKeyDown}>
        <rect className="case" width={width} height={height} rx={18} />
        <rect className="plugboard-panel" x={16} y={16} width={width - 32} height={284} rx={10} />
        {[...sockets].map(([letter, { x, y }]) => (
          <PlugSocket
            key={letter}
            letter={letter}
            partner={partner.get(letter) ?? null}
            plugged={letter === loosePlug || (partner.has(letter) && letter !== dragged)}
            selected={selected === letter && !partner.has(letter)}
            x={x}
            y={y}
            onActivate={activate}
            onGrab={grab}
          />
        ))}
        <g className="cables" aria-hidden="true">
          {plugs
            .filter((pair) => !dragged || !pair.includes(dragged))
            .map(([a, b]) => (
              <Cable key={a + b} from={sockets.get(a)!} to={sockets.get(b)!} />
            ))}
          {loose && loosePlug && (
            <>
              <Cable from={sockets.get(loosePlug)!} to={loose} />
              <rect className="plug" x={loose.x - 10} y={loose.y - plugHeight / 2} width={20} height={plugHeight} rx={4} />
            </>
          )}
        </g>
      </svg>
      <p className="cable-list" aria-label="Cables">
        {plugs.length > 0 ? plugs.join(' ') : 'No cables'} · {plugs.length} of {maxCables}
      </p>
      <p className="hint">
        Drag a cable between two sockets, or pick two sockets in turn. Click a plugged socket to remove its cable, or drag its plug to another socket or off the board.
      </p>
    </section>
  );
}
