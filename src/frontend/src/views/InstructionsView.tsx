import { isValidElement, useRef, useState, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { guideContents, guideIndex, guidePages, guideSection, guideTitle, linkedPage, type GuideEntry } from '../guide';

/** Writes a plain code block by hand, one character per square so its columns stay aligned. */
function Pre({ children }: { children?: ReactNode }) {
  const code = isValidElement<{ className?: string; children?: ReactNode }>(children) ? children.props : null;
  if (!code || code.className || typeof code.children !== 'string') {
    return <pre>{children}</pre>;
  }
  return (
    <pre className="guide-hand">
      {code.children
        .replace(/\r?\n$/, '')
        .split(/\r?\n/)
        .map((line, row) => (
          <span key={row} className="guide-hand-line">
            {[...line].map((char, column) => (
              <span key={column} className="guide-hand-square">
                {char}
              </span>
            ))}
          </span>
        ))}
    </pre>
  );
}

/** The table of contents: a link per page, and a button that opens or closes each section. */
function Contents({
  page,
  open,
  onOpen,
  onToggle,
  onHide,
}: {
  page: string;
  open: Set<string>;
  onOpen: (page: string) => void;
  onToggle: (section: string) => void;
  onHide: () => void;
}) {
  const link = (target: string) => (
    <a
      href={`#${target}`}
      aria-current={target === page ? 'page' : undefined}
      onClick={(event) => {
        event.preventDefault();
        onOpen(target);
      }}
    >
      {guideTitle(target)}
    </a>
  );
  const entry = ({ page: target, children }: GuideEntry) => {
    const expanded = open.has(target);
    return (
      <li key={target}>
        {children ? (
          <button type="button" className="guide-toggle" aria-expanded={expanded} aria-label={guideTitle(target)} onClick={() => onToggle(target)}>
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="guide-toggle" />
        )}
        {link(target)}
        {children && expanded && <ul>{children.map(entry)}</ul>}
      </li>
    );
  };

  return (
    <nav className="guide-contents" aria-label="Contents">
      <button type="button" className="guide-hide" onClick={onHide}>
        Hide contents
      </button>
      <p className="guide-start">{link(guideIndex)}</p>
      <ul>{guideContents.map(entry)}</ul>
    </nav>
  );
}

/** Shows the user guide beside its table of contents. Links between its pages open them here; other links show as text. */
export function InstructionsView() {
  const [page, setPage] = useState(guideIndex);
  const [sections, setSections] = useState<Set<string>>(() => new Set());
  const [contentsShown, setContentsShown] = useState(true);
  const top = useRef<HTMLElement>(null);

  const open = (next: string) => {
    setPage(next);
    const section = guideSection(next);
    if (section?.children) {
      setSections((current) => new Set(current).add(section.page));
    }
    top.current?.scrollIntoView?.();
  };

  const toggle = (section: string) =>
    setSections((current) => {
      const next = new Set(current);
      if (!next.delete(section)) {
        next.add(section);
      }
      return next;
    });

  const components: Components = {
    a: ({ href, children }: { href?: string; children?: ReactNode }) => {
      const target = linkedPage(page, href);
      if (!target) {
        return <span>{children}</span>;
      }
      return (
        <a
          href={`#${target}`}
          onClick={(event) => {
            event.preventDefault();
            open(target);
          }}
        >
          {children}
        </a>
      );
    },
    img: () => null,
    pre: Pre,
  };

  return (
    <div className="guide-layout">
      {contentsShown ? (
        <Contents page={page} open={sections} onOpen={open} onToggle={toggle} onHide={() => setContentsShown(false)} />
      ) : (
        <button type="button" className="guide-show" aria-label="Show contents" title="Show contents" onClick={() => setContentsShown(true)}>
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" />
            <path d="M5.5 2.5v11M8.5 6l2 2-2 2" fill="none" stroke="currentColor" />
          </svg>
        </button>
      )}
      <article ref={top} className="guide" aria-label="Instructions">
        <Markdown remarkPlugins={[remarkGfm]} components={components}>
          {guidePages[page]}
        </Markdown>
      </article>
    </div>
  );
}
