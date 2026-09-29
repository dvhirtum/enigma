import { useEffect, useState } from 'react';
import type { Problem } from './api';
import { useMachine } from './store';

/** How long an error shows before it fades out, and how long the fade takes. */
export const errorShownMs = 5000;
export const errorFadeMs = 500;

function Toast({ error, className }: { error: Problem; className: string }) {
  const dismiss = useMachine((store) => store.dismissError);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fade = setTimeout(() => setFading(true), errorShownMs);
    const close = setTimeout(dismiss, errorShownMs + errorFadeMs);
    return () => {
      clearTimeout(fade);
      clearTimeout(close);
    };
  }, [dismiss]);

  return (
    <div className={fading ? `${className} error-fading` : className} role="alert">
      <span>
        {error.title}
        {error.detail && ` ${error.detail}`}
      </span>
      <button type="button" onClick={dismiss}>
        Dismiss
      </button>
    </div>
  );
}

const ids = new WeakMap<Problem, number>();
let nextId = 0;

/** A number per error object, so a new error (even with the same text) shows afresh. */
function idOf(error: Problem): number {
  let id = ids.get(error);
  if (id === undefined) {
    id = nextId++;
    ids.set(error, id);
  }
  return id;
}

/** The last rejected operation, floating over the content. It fades out after a few seconds; a new error starts over. */
export function ErrorToast({ className }: { className: string }) {
  const error = useMachine((store) => store.error);
  return error ? <Toast key={idOf(error)} error={error} className={className} /> : null;
}
