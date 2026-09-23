import { useEffect, useRef } from 'react';

/** Wheel distance in pixels for one step. A mouse-wheel notch covers it at once, a trackpad adds up to it. */
const stepDistance = 50;

/**
 * Turns one step for each notch of the mouse wheel over the element, and blocks page scrolling there.
 * Returns the ref for the element.
 */
export function useWheelTurn<T extends SVGElement>(onTurn: (steps: number) => void, disabled: boolean) {
  const ref = useRef<T>(null);
  const distance = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) {
      return;
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL ? event.deltaY : Math.sign(event.deltaY) * stepDistance;
      if (Math.sign(delta) !== Math.sign(distance.current)) {
        distance.current = 0;
      }
      distance.current += delta;
      if (Math.abs(distance.current) >= stepDistance) {
        onTurn(distance.current < 0 ? 1 : -1);
        distance.current = 0;
      }
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [onTurn, disabled]);

  return ref;
}
