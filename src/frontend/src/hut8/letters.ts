/** Text in groups of five. */
export function groups(text: string): string {
  return text.match(/.{1,5}/g)?.join(' ') ?? '';
}

/** Keeps the letters of typed text, in capitals. */
export function cribLetters(text: string): string {
  return text.toUpperCase().replace(/[^A-Z]/g, '');
}

export function plural(count: number, one: string, many = `${one}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : many}`;
}
