import { fireEvent } from '@testing-library/react';

/** A press and release without moving: a click for `usePlugDrag`. */
export function click(element: Element) {
  fireEvent.pointerDown(element, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerUp(element, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
}

/** A drag from one socket to another, or off the sockets when `to` has none. */
export function dragTo(from: Element, to: Element) {
  fireEvent.pointerDown(from, { button: 0, pointerId: 1, clientX: 10, clientY: 10 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 60, clientY: 40 });
  fireEvent.pointerUp(to, { button: 0, pointerId: 1, clientX: 120, clientY: 80 });
}
