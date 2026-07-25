"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { generateMaze, solvePath, canMove, step, type MazeData, type Dir } from "@/lib/maze";

interface MazeBoardProps {
  seed: string;
  cols: number;
  rows: number;
  /** Called once when the player reaches the exit, with elapsed ms + move count. */
  onComplete?: (timeMs: number, moves: number) => void;
  /** Called on every accepted move — used to broadcast live progress in races. */
  onProgress?: (pos: { x: number; y: number }, stepsTaken: number, atEnd: boolean) => void;
  /** Ghost/opponent position to render as a second token (competitive mode). */
  opponentCell?: { x: number; y: number } | null;
  opponentLabel?: string;
  disabled?: boolean;
  paused?: boolean;
}

const CELL = 34;
const PAD = 20;

export default function MazeBoard({
  seed,
  cols,
  rows,
  onComplete,
  onProgress,
  opponentCell,
  opponentLabel,
  disabled,
  paused,
}: MazeBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [maze, setMaze] = useState<MazeData | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([{ x: 0, y: 0 }]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [hintPath, setHintPath] = useState<{ x: number; y: number }[]>([]);
  const [scale, setScale] = useState(1);

  // Generate maze whenever the seed changes.
  useEffect(() => {
    const m = generateMaze(cols, rows, seed);
    setMaze(m);
    setPos(m.start);
    setTrail([m.start]);
    setMoves(0);
    setStartTime(null);
    setFinished(false);
    setHintPath([]);
  }, [seed, cols, rows]);

  // Responsive scale to fit the container width (desktop AND mobile).
  useEffect(() => {
    function resize() {
      if (!wrapRef.current) return;
      const available = wrapRef.current.clientWidth;
      const natural = cols * CELL + PAD * 2;
      setScale(Math.min(1, available / natural));
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [cols]);

  const move = useCallback(
    (dir: Dir) => {
      if (!maze || finished || disabled || paused) return;
      if (!canMove(maze, pos.x, pos.y, dir)) return;
      const next = step(pos.x, pos.y, dir);
      setStartTime((t) => t ?? Date.now());
      setPos(next);
      setTrail((tr) => [...tr, next]);
      setMoves((m) => m + 1);
      setHintPath([]);

      const atEnd = next.x === maze.end.x && next.y === maze.end.y;
      onProgress?.(next, trail.length, atEnd);

      if (atEnd) {
        setFinished(true);
        onComplete?.(Date.now() - (startTime ?? Date.now()), moves + 1);
      }
    },
    [maze, pos, finished, disabled, paused, trail.length, onProgress, onComplete, startTime, moves]
  );

  // Keyboard controls.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const map: Record<string, Dir> = {
        ArrowUp: "N",
        ArrowDown: "S",
        ArrowLeft: "W",
        ArrowRight: "E",
        w: "N",
        s: "S",
        a: "W",
        d: "E",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  // Swipe controls for touch devices.
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchStart.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.current.x;
    const dy = t.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      move(dx > 0 ? "E" : "W");
    } else {
      move(dy > 0 ? "S" : "N");
    }
  }

  function showHint() {
    if (!maze) return;
    const path = solvePath(maze, pos, maze.end);
    setHintPath(path.slice(0, 4));
  }

  // Draw.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !maze) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = cols * CELL + PAD * 2;
    const height = rows * CELL + PAD * 2;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const ink = getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#e9ecf5";
    const trailColor = getComputedStyle(document.documentElement).getPropertyValue("--trail").trim() || "#5ee6c9";
    const spark = getComputedStyle(document.documentElement).getPropertyValue("--spark").trim() || "#ffb454";
    const volt = getComputedStyle(document.documentElement).getPropertyValue("--volt").trim() || "#7c8cff";

    const cx = (x: number) => PAD + x * CELL + CELL / 2;
    const cy = (y: number) => PAD + y * CELL + CELL / 2;

    // walls
    ctx.strokeStyle = ink;
    ctx.lineCap = "round";
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cell = maze.grid[y][x];
        const x0 = PAD + x * CELL;
        const y0 = PAD + y * CELL;
        if (cell.walls.N) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0 + CELL, y0);
        }
        if (cell.walls.W) {
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y0 + CELL);
        }
        if (y === rows - 1 && cell.walls.S) {
          ctx.moveTo(x0, y0 + CELL);
          ctx.lineTo(x0 + CELL, y0 + CELL);
        }
        if (x === cols - 1 && cell.walls.E) {
          ctx.moveTo(x0 + CELL, y0);
          ctx.lineTo(x0 + CELL, y0 + CELL);
        }
      }
    }
    ctx.stroke();

    // travelled trail
    if (trail.length > 1) {
      ctx.strokeStyle = trailColor;
      ctx.lineWidth = 6;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(cx(p.x), cy(p.y));
        else ctx.lineTo(cx(p.x), cy(p.y));
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // hint path
    if (hintPath.length > 1) {
      ctx.strokeStyle = spark;
      ctx.lineWidth = 5;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      hintPath.forEach((p, i) => {
        if (i === 0) ctx.moveTo(cx(p.x), cy(p.y));
        else ctx.lineTo(cx(p.x), cy(p.y));
      });
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // start marker
    ctx.fillStyle = ink;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(cx(maze.start.x), cy(maze.start.y), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // end marker (flag)
    ctx.fillStyle = trailColor;
    ctx.beginPath();
    ctx.arc(cx(maze.end.x), cy(maze.end.y), 9, 0, Math.PI * 2);
    ctx.fill();

    // opponent ghost token
    if (opponentCell) {
      ctx.fillStyle = spark;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.arc(cx(opponentCell.x), cy(opponentCell.y), 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (opponentLabel) {
        ctx.fillStyle = spark;
        ctx.font = "10px var(--font-body)";
        ctx.textAlign = "center";
        ctx.fillText(opponentLabel, cx(opponentCell.x), cy(opponentCell.y) - 14);
      }
    }

    // player token
    ctx.fillStyle = volt;
    ctx.beginPath();
    ctx.arc(cx(pos.x), cy(pos.y), 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#05070c";
    ctx.lineWidth = 2;
    ctx.stroke();
  }, [maze, trail, pos, hintPath, opponentCell, opponentLabel, cols, rows]);

  if (!maze) return null;

  return (
    <div ref={wrapRef} className="w-full">
      <div
        className="mx-auto touch-none select-none overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)]"
        style={{ width: (cols * CELL + PAD * 2) * scale, height: (rows * CELL + PAD * 2) * scale }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <canvas ref={canvasRef} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--ink-dim)]">
          Moves: <span className="font-semibold text-[var(--ink)]">{moves}</span>
        </div>
        <button onClick={showHint} className="btn btn-ghost !py-1.5 !px-3 text-sm" disabled={finished}>
          ⚡ Hint
        </button>
      </div>

      {/* On-screen D-pad for touch/desktop click fallback */}
      <div className="mx-auto mt-4 grid w-40 grid-cols-3 grid-rows-3 gap-1 md:hidden">
        <span />
        <DPadBtn label="↑" onClick={() => move("N")} />
        <span />
        <DPadBtn label="←" onClick={() => move("W")} />
        <span />
        <DPadBtn label="→" onClick={() => move("E")} />
        <span />
        <DPadBtn label="↓" onClick={() => move("S")} />
        <span />
      </div>
    </div>
  );
}

function DPadBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="panel-raised flex h-11 w-11 items-center justify-center text-lg font-bold active:scale-95"
    >
      {label}
    </button>
  );
}
