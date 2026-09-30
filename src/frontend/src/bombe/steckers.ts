/** Every partner written for each letter on a stecker sheet such as "AD EP EX RR" (RR: R is unsteckered). */
export function partnersOf(sheet: string): Record<string, string[]> {
  const partners: Record<string, string[]> = {};
  const add = (letter: string, partner: string) => {
    partners[letter] = [...(partners[letter] ?? []), partner].filter((own, index, all) => all.indexOf(own) === index).sort();
  };
  for (const [a, b] of sheet.split(' ').filter((pair) => pair.length === 2)) {
    add(a, b);
    add(b, a);
  }
  return partners;
}

/** The sheet with every pair of `letter` rubbed out. */
export function withoutLetter(sheet: string, letter: string): string {
  return sheet
    .split(' ')
    .filter((pair) => pair.length === 2 && !pair.includes(letter))
    .join(' ');
}

/** The letters in contradiction: those with more than one partner, and their partners. */
export function contradictionsOf(sheet: string): Set<string> {
  const partners = partnersOf(sheet);
  return new Set(Object.entries(partners).flatMap(([letter, own]) => (own.length > 1 ? [letter, ...own] : [])));
}
