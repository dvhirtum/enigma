import { useState, type ReactNode } from 'react';
import { useMachine } from '../store';

/** Handwriting inside printed text. */
export function Hand({ children }: { children: ReactNode }) {
  return <span className="hand">{children}</span>;
}

/**
 * Writes `text` by hand, one character per square. Each space leaves an empty square, and groups do not break across lines.
 * `stacked` writes each group on a line of its own.
 */
export function Squares({ text, label, stacked = false }: { text: string; label?: string; stacked?: boolean }) {
  const words = text.split(' ').filter(Boolean);
  return (
    <span className={stacked ? 'squares squares-stacked' : 'squares'} role={label ? 'group' : undefined} aria-label={label}>
      {words.map((word, wordIndex) => (
        <span key={wordIndex} className="squares-group">
          {[...word].map((letter, index) => (
            <span key={index} className="square">
              {letter}
            </span>
          ))}
          {wordIndex < words.length - 1 && <span className="square"> </span>}
        </span>
      ))}
    </span>
  );
}

/** A printed label with handwritten squares after it. */
export function Field({ label, value, stacked }: { label: string; value: string; stacked?: boolean }) {
  return (
    <p className="field">
      <span className="field-label">{label}</span>
      <Squares text={value} label={label} stacked={stacked} />
    </p>
  );
}

/** Copies `text` to the clipboard, and says so once copied. */
export function CopyButton({ text }: { text: string }) {
  const copyText = useMachine((store) => store.copyText);
  const [copied, setCopied] = useState(false);
  const copy = async () => setCopied(await copyText(text));
  return (
    <button type="button" onClick={() => void copy()}>
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}
