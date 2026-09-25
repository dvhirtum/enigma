const files = import.meta.glob<string>('../../../docs/user/*.md', { query: '?raw', import: 'default', eager: true });

/** The user guide in `docs/user`, by file name. */
export const guidePages: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([path, text]) => [path.slice(path.lastIndexOf('/') + 1), text]),
);

export const guideIndex = 'README.md';
