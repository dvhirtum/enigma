/** A window with a side panel on the right. The arrow points left (open it) or right (close it). */
export function PanelIcon({ open }: { open: boolean }) {
  return (
    <svg className="panel-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" data-testid={open ? 'panel-icon-close' : 'panel-icon-open'}>
      <rect x="2.5" y="4" width="19" height="16" rx="2" />
      <path className="panel-icon-strip" d="M15 4.5h4.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5H15z" />
      <line x1="15" y1="4" x2="15" y2="20" />
      <path d={open ? 'M5.5 12h6M9 9l3 3-3 3' : 'M12 12H6M8.5 9l-3 3 3 3'} />
    </svg>
  );
}

/** A message pad with a pencil. */
export function OperatorIcon() {
  return (
    <svg className="panel-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <rect className="panel-icon-strip" x="3.5" y="3" width="13" height="18" rx="1.5" />
      <rect x="3.5" y="3" width="13" height="18" rx="1.5" />
      <path d="M6.5 8h7M6.5 11.5h7M6.5 15h4" />
      <path d="M19.5 7.5l1.5 1.5-6 6-2 .5.5-2z" />
    </svg>
  );
}

/** An open book. */
export function InstructionsIcon() {
  return (
    <svg className="panel-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path className="panel-icon-strip" d="M12 6.5C10 5 7 4.5 3 5v13.5c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" />
      <path d="M12 6.5C10 5 7 4.5 3 5v13.5c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5zM12 6.5V20" />
    </svg>
  );
}
