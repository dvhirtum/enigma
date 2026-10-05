const root = '../../../docs/user/';
const files = import.meta.glob<string>('../../../docs/user/**/*.md', { query: '?raw', import: 'default', eager: true });

/** The user guide in `docs/user`, by path relative to it (e.g. `enigma/machine.md`). */
export const guidePages: Record<string, string> = Object.fromEntries(Object.entries(files).map(([path, text]) => [path.slice(root.length), text]));

export const guideIndex = 'README.md';

/** A page in the guide's table of contents, with the pages of its section. */
export interface GuideEntry {
  page: string;
  children?: GuideEntry[];
}

const pages = (folder: string, names: string[]): GuideEntry[] => names.map((name) => ({ page: `${folder}/${name}.md` }));

/** The table of contents: the Enigma, the Bombe and the glossary, each section with its pages in reading order. */
export const guideContents: GuideEntry[] = [
  {
    page: 'enigma/README.md',
    children: pages('enigma', ['history', 'machine', 'key-sheets', 'sending-by-hand', 'receiving-by-hand', 'operator-mode', 'officer-keys']),
  },
  { page: 'bombe/README.md', children: pages('bombe', ['history', 'using-the-bombe', 'breaking-a-message', 'breaking-the-m4']) },
  { page: 'glossary.md' },
];

/** The title of a page: its first heading. */
export function guideTitle(page: string): string {
  return /^# (.+)$/m.exec(guidePages[page] ?? '')?.[1] ?? page;
}

/** The section of the table of contents a page belongs to, or null for the contents page. */
export function guideSection(page: string): GuideEntry | null {
  return guideContents.find((entry) => entry.page === page || entry.children?.some((child) => child.page === page)) ?? null;
}

/** The guide page a link on `from` points to, or null for a link outside the guide. */
export function linkedPage(from: string, href: string | undefined): string | null {
  const path = href?.split('#')[0];
  if (!path || /^[a-z]+:/i.test(path)) {
    return null;
  }
  const parts = from.split('/').slice(0, -1);
  for (const part of path.split('/')) {
    if (part === '..') {
      parts.pop();
    } else if (part !== '.') {
      parts.push(part);
    }
  }
  const page = parts.join('/');
  return page in guidePages ? page : null;
}
