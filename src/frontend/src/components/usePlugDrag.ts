import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface Drag {
  from: string;
  /** The pointer in SVG coordinates, once it is known. */
  point: Point | null;
}

/** Pointer distance in pixels before a press on a socket becomes a drag. */
const dragDistance = 5;

function toSvgPoint(svg: SVGSVGElement | null, event: PointerEvent): Point | null {
  const matrix = svg?.getScreenCTM?.();
  if (!matrix) {
    return null;
  }
  const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
  return { x: point.x, y: point.y };
}

function socketAt(event: PointerEvent): string | null {
  const hit = document.elementFromPoint?.(event.clientX, event.clientY) ?? event.target;
  return hit instanceof Element ? (hit.closest('[data-socket]')?.getAttribute('data-socket') ?? null) : null;
}

/**
 * Drags cable ends between the sockets of `svg`. A press without a drag calls `onClick`;
 * a drag calls `onDrop` with the socket under the pointer, or null off the sockets.
 */
export function usePlugDrag(
  svg: RefObject<SVGSVGElement | null>,
  onClick: (letter: string) => void,
  onDrop: (from: string, to: string | null) => void,
) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const stop = useRef<(() => void) | null>(null);

  useEffect(() => () => stop.current?.(), []);

  const grab = (letter: string, event: ReactPointerEvent<SVGGElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    stop.current?.();
    const start = { x: event.clientX, y: event.clientY };
    let moved = false;

    const onMove = (move: PointerEvent) => {
      moved ||= Math.hypot(move.clientX - start.x, move.clientY - start.y) >= dragDistance;
      if (moved) {
        setDrag({ from: letter, point: toSvgPoint(svg.current, move) });
      }
    };
    const onUp = (up: PointerEvent) => {
      end();
      if (moved) {
        onDrop(letter, socketAt(up));
      } else {
        onClick(letter);
      }
    };
    const end = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', end);
      stop.current = null;
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', end);
    stop.current = end;
  };

  return { drag, grab };
}
