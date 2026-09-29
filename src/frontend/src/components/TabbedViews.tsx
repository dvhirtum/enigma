import { useRef, useState, type ComponentType, type KeyboardEvent } from 'react';

export interface TabbedView {
  id: string;
  label: string;
  View: ComponentType;
}

/** A vertical tab list and the selected view. The arrow keys move between the tabs. */
export function TabbedViews({ label, views }: { label: string; views: readonly TabbedView[] }) {
  const [selected, setSelected] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onTabKeyDown = (event: KeyboardEvent) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (step === undefined) {
      return;
    }
    event.preventDefault();
    const next = (selected + step + views.length) % views.length;
    setSelected(next);
    tabs.current[next]?.focus();
  };

  const { id, View } = views[selected];

  return (
    <>
      <nav role="tablist" aria-label={label} aria-orientation="vertical" onKeyDown={onTabKeyDown}>
        {views.map((view, index) => (
          <button
            key={view.id}
            ref={(element) => {
              tabs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`tab-${view.id}`}
            aria-selected={index === selected}
            aria-controls={`panel-${view.id}`}
            tabIndex={index === selected ? 0 : -1}
            onClick={() => setSelected(index)}
          >
            {view.label}
          </button>
        ))}
      </nav>
      <main role="tabpanel" id={`panel-${id}`} aria-labelledby={`tab-${id}`}>
        <View />
      </main>
    </>
  );
}
