// Arrow Puzzle engine — the "tap an arrow, it slides to the edge if the path
// is clear, clear the whole board" mechanic (à la Easybrain's Arrow Puzzle).
//
// GENERATION STRATEGY (this is the part that has to be careful):
// We build the board by deciding a REMOVAL ORDER up front (a random
// permutation of the active cells), then assign each cell a direction whose
// ray to the board edge is guaranteed clear of every cell that is still
// "in the future" relative to that order (i.e. cells that would still be on
// the board at the moment this cell is removed, if the player follows that
// exact order). That guarantees at least one full solution exists.

export type Dir = "N" | "E" | "S" | "W";
const DELTA: Record<Dir, [number, number]> = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
};
export const ALL_DIRS: Dir[] = ["N", "E", "S", "W"];

export interface Tile {
  x: number;
  y: number;
  active: boolean; // part of the puzzle shape at all (false = permanent gap)
  present: boolean; // still on the board (false = already cleared)
  dir: Dir | null; // arrow direction (null if not active)
}

export interface Board {
  cols: number;
  rows: number;
  seed: string;
  tiles: Tile[][]; // tiles[y][x]
  totalActive: number;
  solutionOrder: { x: number; y: number }[]; // one guaranteed-valid full clear order
}

// ---- seeded RNG (mulberry32) ------------------------------------------------
function hashSeed(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Dense, organic "creature" silhouette: a wide torso/arms/head band up top
 * that splits into two leg-like columns lower down, with a light random
 * jitter at the edges so it doesn't look like a rigid geometric shape.
 * Much higher fill than a plain rectangle — this is what gives the packed,
 * interlocking look instead of scattered isolated tiles. */
function isShapeActive(x: number, y: number, cols: number, rows: number, rand: () => number, fill: number) {
  const nx = cols <= 1 ? 0.5 : x / (cols - 1); // 0..1 left->right
  const ny = rows <= 1 ? 0.5 : y / (rows - 1); // 0..1 top->bottom

  const legSplit = 0.58; // fraction down where legs begin
  let base: number;

  if (ny < legSplit) {
    // torso/head/arms: wide, tapering slightly at the very top corners
    const topTaper = ny < 0.12 ? 1 - Math.abs(nx - 0.5) * 0.9 : 1;
    const sideTaper = 1 - Math.pow(Math.abs(nx - 0.5) * 2, 6) * 0.35;
    base = Math.min(topTaper, sideTaper);
  } else {
    // legs: two columns with a gap down the middle
    const legNy = (ny - legSplit) / (1 - legSplit); // 0..1 within leg band
    const leftLeg = Math.abs(nx - 0.28);
    const rightLeg = Math.abs(nx - 0.72);
    const nearestLeg = Math.min(leftLeg, rightLeg);
    const legWidth = 0.24 - legNy * 0.03;
    base = nearestLeg < legWidth ? 1 : 0.05;
  }

  const prob = fill * base;
  return rand() < Math.max(0, Math.min(1, prob));
}

/** Region color assignment: partitions active cells into ~5 zones by
 * nearest anchor point (purely cosmetic, mirrors a layered multi-color
 * look), returning a palette index per cell. */
const REGION_ANCHORS = [
  { x: 0.22, y: 0.22 },
  { x: 0.5, y: 0.18 },
  { x: 0.78, y: 0.22 },
  { x: 0.32, y: 0.78 },
  { x: 0.68, y: 0.78 },
];

export function regionIndex(x: number, y: number, cols: number, rows: number): number {
  const nx = cols <= 1 ? 0.5 : x / (cols - 1);
  const ny = rows <= 1 ? 0.5 : y / (rows - 1);
  let best = 0;
  let bestDist = Infinity;
  REGION_ANCHORS.forEach((a, i) => {
    const d = (a.x - nx) ** 2 + (a.y - ny) ** 2;
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  });
  return best;
}

/** Trace from (x,y) in direction d to the board edge, returning the cells
 * passed through (exclusive of the origin). */
function rayCells(x: number, y: number, dir: Dir, cols: number, rows: number): { x: number; y: number }[] {
  const [dx, dy] = DELTA[dir];
  const cells: { x: number; y: number }[] = [];
  let cx = x + dx;
  let cy = y + dy;
  while (cx >= 0 && cy >= 0 && cx < cols && cy < rows) {
    cells.push({ x: cx, y: cy });
    cx += dx;
    cy += dy;
  }
  return cells;
}

export function generateBoard(cols: number, rows: number, seed: string, fill = 0.96): Board {
  const rand = mulberry32(hashSeed(seed));

  const tiles: Tile[][] = Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => ({
      x,
      y,
      active: isShapeActive(x, y, cols, rows, rand, fill),
      present: false,
      dir: null as Dir | null,
    }))
  );

  // "unassigned" tracks cells that haven't been given a direction yet — this
  // is exactly the set of cells that would still be on the board at this
  // point in a forward simulation of solving the puzzle. We repeatedly pick
  // a currently-"exposed" cell (topmost/bottommost in its column, or
  // leftmost/rightmost in its row, among still-unassigned cells) — such a
  // cell is *guaranteed* to have a clear lane to that edge, because nothing
  // unassigned stands between it and the edge by definition. Assigning cells
  // in this order and recording it as the removal order therefore always
  // produces a fully solvable board.
  const unassigned: boolean[][] = tiles.map((row) => row.map((t) => t.active));
  const order: { x: number; y: number }[] = [];
  let remaining = tiles.flat().filter((t) => t.active).length;
  const totalActive = remaining;

  while (remaining > 0) {
    interface Candidate {
      x: number;
      y: number;
      dirs: Dir[];
    }
    const byCell = new Map<number, Candidate>();
    const addCandidate = (x: number, y: number, d: Dir) => {
      const k = y * cols + x;
      const existing = byCell.get(k);
      if (existing) existing.dirs.push(d);
      else byCell.set(k, { x, y, dirs: [d] });
    };

    for (let x = 0; x < cols; x++) {
      let top = -1;
      let bottom = -1;
      for (let y = 0; y < rows; y++) {
        if (unassigned[y][x]) {
          if (top === -1) top = y;
          bottom = y;
        }
      }
      if (top !== -1) addCandidate(x, top, "N");
      if (bottom !== -1) addCandidate(x, bottom, "S");
    }
    for (let y = 0; y < rows; y++) {
      let left = -1;
      let right = -1;
      for (let x = 0; x < cols; x++) {
        if (unassigned[y][x]) {
          if (left === -1) left = x;
          right = x;
        }
      }
      if (left !== -1) addCandidate(left, y, "W");
      if (right !== -1) addCandidate(right, y, "E");
    }

    const candidates = shuffle([...byCell.values()], rand);
    const pick = candidates[0];
    const dir = shuffle(pick.dirs, rand)[0];

    tiles[pick.y][pick.x].dir = dir;
    tiles[pick.y][pick.x].present = true;
    unassigned[pick.y][pick.x] = false;
    order.push({ x: pick.x, y: pick.y });
    remaining--;
  }

  return { cols, rows, seed, tiles, totalActive, solutionOrder: order };
}

/** Can this tile currently slide off the board? */
export function isMovable(board: Board, x: number, y: number): boolean {
  const tile = board.tiles[y][x];
  if (!tile.active || !tile.present || !tile.dir) return false;
  const ray = rayCells(x, y, tile.dir, board.cols, board.rows);
  return ray.every((c) => !board.tiles[c.y][c.x].present);
}

export function findMovableTiles(board: Board): Tile[] {
  const out: Tile[] = [];
  for (let y = 0; y < board.rows; y++) {
    for (let x = 0; x < board.cols; x++) {
      if (isMovable(board, x, y)) out.push(board.tiles[y][x]);
    }
  }
  return out;
}

export function remainingCount(board: Board): number {
  return board.tiles.flat().filter((t) => t.present).length;
}

export function isSolved(board: Board): boolean {
  return remainingCount(board) === 0;
}
