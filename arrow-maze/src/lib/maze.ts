// Deterministic, seed-based maze generator.
// Same seed -> same maze, which is what lets two racers in a competitive
// match, or a player replaying a level, get an identical board every time.

export type Dir = "N" | "E" | "S" | "W";

export interface Cell {
  walls: Record<Dir, boolean>;
  visited: boolean;
}

export interface MazeData {
  cols: number;
  rows: number;
  seed: string;
  grid: Cell[][]; // grid[y][x]
  start: { x: number; y: number };
  end: { x: number; y: number };
}

const OPPOSITE: Record<Dir, Dir> = { N: "S", S: "N", E: "W", W: "E" };
const DELTA: Record<Dir, [number, number]> = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
};

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

/** Recursive-backtracker perfect maze: every cell reachable, exactly one path
 * between any two cells (no loops), generated deterministically from `seed`. */
export function generateMaze(cols: number, rows: number, seed: string): MazeData {
  const rand = mulberry32(hashSeed(seed));
  const grid: Cell[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      walls: { N: true, E: true, S: true, W: true },
      visited: false,
    }))
  );

  const stack: [number, number][] = [];
  let cx = 0;
  let cy = 0;
  grid[cy][cx].visited = true;
  stack.push([cx, cy]);
  let visitedCount = 1;
  const total = cols * rows;

  while (visitedCount < total) {
    const [x, y] = stack[stack.length - 1];
    const dirs: Dir[] = ["N", "E", "S", "W"].sort(() => rand() - 0.5) as Dir[];
    let moved = false;

    for (const dir of dirs) {
      const [dx, dy] = DELTA[dir];
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (grid[ny][nx].visited) continue;

      grid[y][x].walls[dir] = false;
      grid[ny][nx].walls[OPPOSITE[dir]] = false;
      grid[ny][nx].visited = true;
      stack.push([nx, ny]);
      visitedCount++;
      moved = true;
      break;
    }

    if (!moved) stack.pop();
    if (stack.length === 0) break;
  }

  // Start top-left, end bottom-right by default -> long, satisfying routes.
  const start = { x: 0, y: 0 };
  const end = { x: cols - 1, y: rows - 1 };

  return { cols, rows, seed, grid, start, end };
}

/** BFS shortest path from `from` to `to`, respecting walls. Used for hints
 * and for validating that a maze is solvable (it always is, by construction). */
export function solvePath(
  maze: MazeData,
  from: { x: number; y: number },
  to: { x: number; y: number }
): { x: number; y: number }[] {
  const { cols, rows, grid } = maze;
  const key = (x: number, y: number) => y * cols + x;
  const prev = new Map<number, number>();
  const seen = new Set<number>([key(from.x, from.y)]);
  const queue: { x: number; y: number }[] = [from];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.x === to.x && cur.y === to.y) break;
    const cell = grid[cur.y][cur.x];
    (Object.keys(cell.walls) as Dir[]).forEach((dir) => {
      if (cell.walls[dir]) return;
      const [dx, dy] = DELTA[dir];
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) return;
      const k = key(nx, ny);
      if (seen.has(k)) return;
      seen.add(k);
      prev.set(k, key(cur.x, cur.y));
      queue.push({ x: nx, y: ny });
    });
  }

  const path: { x: number; y: number }[] = [];
  let curKey: number | undefined = key(to.x, to.y);
  if (!seen.has(curKey)) return path; // unreachable (shouldn't happen)
  while (curKey !== undefined) {
    const x = curKey % cols;
    const y = Math.floor(curKey / cols);
    path.unshift({ x, y });
    if (x === from.x && y === from.y) break;
    curKey = prev.get(curKey);
  }
  return path;
}

export function canMove(maze: MazeData, x: number, y: number, dir: Dir): boolean {
  if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return false;
  return !maze.grid[y][x].walls[dir];
}

export function step(x: number, y: number, dir: Dir): { x: number; y: number } {
  const [dx, dy] = DELTA[dir];
  return { x: x + dx, y: y + dy };
}
