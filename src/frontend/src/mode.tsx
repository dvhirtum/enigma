import { createContext, useContext } from 'react';

export type Mode = 'enigma' | 'bombe';

const modes: { id: Mode; label: string }[] = [
  { id: 'enigma', label: 'Enigma' },
  { id: 'bombe', label: 'Bombe' },
];

interface ModeContextValue {
  mode: Mode;
  setMode: (mode: Mode) => void;
}

const ModeContext = createContext<ModeContextValue | null>(null);

export const ModeProvider = ModeContext.Provider;

/** False inside the frame of the mode that is not shown, so it leaves the physical keyboard alone. */
export const ActiveContext = createContext(true);

export function useActive(): boolean {
  return useContext(ActiveContext);
}

/** The header title: the active mode, next to the other mode, which switches to it. */
export function ModeSwitch({ disabled = false }: { disabled?: boolean }) {
  const context = useContext(ModeContext);
  if (!context) {
    return <h1>Enigma</h1>;
  }

  return (
    <h1 className="mode-switch" aria-label="Mode">
      {modes.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          aria-pressed={id === context.mode}
          disabled={disabled && id !== context.mode}
          onClick={() => context.setMode(id)}
        >
          {label}
        </button>
      ))}
    </h1>
  );
}
