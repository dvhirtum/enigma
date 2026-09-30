/** Each known letter's partner from pairs such as "AD ET RR" (RR: R is unsteckered). */
export function partnersOf(steckers: string): Record<string, string> {
  const partners: Record<string, string> = {};
  for (const [a, b] of steckers.split(' ').filter((pair) => pair.length === 2)) {
    partners[a] = b;
    partners[b] = a;
  }
  return partners;
}

/** Writes partners as pairs, lower letter first, in alphabetical order. */
export function pairsOf(partners: Record<string, string>): string {
  return Object.entries(partners)
    .filter(([letter, partner]) => letter <= partner)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, partner]) => letter + partner)
    .join(' ');
}

/**
 * The steckers with `letter` paired to `partner` (itself: unsteckered), or unknown when `partner` is null. The pairs
 * either letter had before are removed, so their old partners become unknown.
 */
export function withPartner(steckers: string, letter: string, partner: string | null): string {
  const partners = partnersOf(steckers);
  for (const changed of partner === null ? [letter] : [letter, partner]) {
    const old = partners[changed];
    if (old !== undefined) {
      delete partners[old];
      delete partners[changed];
    }
  }
  if (partner !== null) {
    partners[letter] = partner;
    partners[partner] = letter;
  }
  return pairsOf(partners);
}
