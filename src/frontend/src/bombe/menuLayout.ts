/** A menu link: two letters and the offset from the crib start (1 = ZZA). */
export interface Link {
  id: string;
  first: string;
  second: string;
  offset: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Reads a link such as "SW1": the two letters, then the offset. */
export function parseLink(link: string): Link {
  return { id: link, first: link[0], second: link[1], offset: Number(link.slice(2)) };
}

/** The letters of the links, A to Z. */
export function lettersOf(links: Link[]): string[] {
  return [...new Set(links.flatMap((link) => [link.first, link.second]))].sort();
}

/**
 * Places the letters of the links in a `width` × `height` box, keeping `margin` from the edges: a force-directed layout
 * (Fruchterman–Reingold) started from a circle, then scaled to fit, so the same links always give the same picture.
 */
export function layoutMenu(links: Link[], width: number, height: number, margin: number): Record<string, Point> {
  const letters = lettersOf(links);
  const k = 100;
  const points = letters.map((_, i) => {
    const angle = (2 * Math.PI * i) / letters.length - Math.PI / 2;
    return { x: 2 * k * Math.cos(angle), y: 2 * k * Math.sin(angle) };
  });
  const index = new Map(letters.map((letter, i) => [letter, i]));
  const pairs = [...new Set(links.map((link) => [link.first, link.second].sort().join('')))].map((pair) => [index.get(pair[0])!, index.get(pair[1])!]);
  const iterations = 300;

  for (let step = 0; step < iterations; step++) {
    const moves = points.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const [dx, dy, distance] = apart(points[i], points[j]);
        const push = (k * k) / distance;
        moves[i].x += (dx / distance) * push;
        moves[i].y += (dy / distance) * push;
        moves[j].x -= (dx / distance) * push;
        moves[j].y -= (dy / distance) * push;
      }
    }
    for (const [i, j] of pairs) {
      const [dx, dy, distance] = apart(points[i], points[j]);
      const pull = (distance * distance) / k;
      moves[i].x -= (dx / distance) * pull;
      moves[i].y -= (dy / distance) * pull;
      moves[j].x += (dx / distance) * pull;
      moves[j].y += (dy / distance) * pull;
    }
    // A pull to the centre keeps separate parts of the menu close.
    const temperature = k * (1 - step / iterations);
    points.forEach((point, i) => {
      const move = { x: moves[i].x - point.x * 0.5, y: moves[i].y - point.y * 0.5 };
      const length = Math.hypot(move.x, move.y) || 1;
      const scale = Math.min(length, temperature) / length;
      point.x += move.x * scale;
      point.y += move.y * scale;
    });
  }

  const fitted = fit(points, width, height, margin);
  return Object.fromEntries(letters.map((letter, i) => [letter, fitted[i]]));
}

/** Scales and moves the points to fill the box inside the margin, stretching one way at most 1.6 times the other. */
function fit(points: Point[], width: number, height: number, margin: number): Point[] {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const [left, top] = [Math.min(...xs), Math.min(...ys)];
  const [spanX, spanY] = [Math.max(...xs) - left, Math.max(...ys) - top];
  const [fitX, fitY] = [(width - 2 * margin) / (spanX || 1), (height - 2 * margin) / (spanY || 1)];
  const [scaleX, scaleY] = [Math.min(fitX, 1.6 * fitY, 2), Math.min(fitY, 1.6 * fitX, 2)];
  const [offsetX, offsetY] = [(width - spanX * scaleX) / 2, (height - spanY * scaleY) / 2];
  return points.map((point) => ({ x: offsetX + (point.x - left) * scaleX, y: offsetY + (point.y - top) * scaleY }));
}

function apart(a: Point, b: Point): [number, number, number] {
  const [dx, dy] = [a.x - b.x, a.y - b.y];
  return [dx || 0.01, dy || 0.01, Math.max(0.01, Math.hypot(dx, dy))];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
