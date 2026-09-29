import { isValidElement, useRef, useState, type ReactNode } from 'react';
import Markdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { guideIndex, guidePages } from '../guide';

/** The guide page a link points to, or null for a link outside the guide. */
function linkedPage(href: string | undefined): string | null {
  const page = href?.split('#')[0];
  return page && page in guidePages ? page : null;
}

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

/** Shows the user guide. Links between its pages open them here; other links show as text. */
export function InstructionsView() {
  const [page, setPage] = useState(guideIndex);
  const top = useRef<HTMLElement>(null);

  const open = (next: string) => {
    setPage(next);
    top.current?.scrollIntoView?.();
  };

  const components: Components = {
    a: ({ href, children }: { href?: string; children?: ReactNode }) => {
      const target = linkedPage(href);
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
    <article ref={top} className="guide" aria-label="Instructions">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {guidePages[page]}
      </Markdown>
    </article>
  );
}
