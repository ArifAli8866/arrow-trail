"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  generateBoard,
  isMovable,
  findMovableTiles,
  remainingCount,
  type Board,
  type Dir,
} from "@/lib/arrowPuzzle";

const ARROW_GLYPH: Record<Dir, string> = { N: "↑", S: "↓", E: "→", W: "←" };
const DELTA: Record<Dir, [number, number]> = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

interface ArrowBoardProps {
  seed: string;
  cols: number;
  rows: number;
  fill?: number;
  maxHearts?: number;
  /** Called once when the last tile clears, with elapsed ms + mistake count. */
  onComplete?: (timeMs: number, mistakes: number) => void;
  /** Called on every successful clear — used to broadcast live progress in races. */
  onProgress?: (cleared: number, total: number, done: boolean) => void;
  disabled?: boolean;
}

export default function ArrowBoard({
  seed,
  cols,
  rows,
  fill = 0.85,
  maxHearts = 3,
  onComplete,
  onProgress,
  disabled,
}: ArrowBoardProps) {
  const [board, setBoard] = useState<Board | null>(null);
  const [, forceTick] = useState(0);
  const [flying, setFlying] = useState<{ x: number; y: number; dir: Dir } | null>(null);
  const [shaking, setShaking] = useState<{ x: number; y: number } | null>(null);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [hearts, setHearts] = useState(maxHearts);
  const [mistakes, setMistakes] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const b = generateBoard(cols, rows, seed, fill);
    setBoard(b);
    setHearts(maxHearts);
    setMistakes(0);
    setStartTime(null);
    setFinished(false);
    setHint(null);
    setFlying(null);
  }, [seed, cols, rows, fill, maxHearts]);

  const total = board?.totalActive ?? 0;
  const cleared = board ? total - remainingCount(board) : 0;

  const handleTap = useCallback(
    (x: number, y: number) => {
      if (!board || disabled || finished || flying) return;
      const tile = board.tiles[y][x];
      if (!tile.active || !tile.present) return;
      setHint(null);
      setStartTime((t) => t ?? Date.now());

      if (isMovable(board, x, y)) {
        setFlying({ x, y, dir: tile.dir! });
        setTimeout(() => {
          tile.present = false;
          setFlying(null);
          forceTick((n) => n + 1);
          const nowCleared = total - remainingCount(board);
          const done = remainingCount(board) === 0;
          onProgress?.(nowCleared, total, done);
          if (done) {
            setFinished(true);
            onComplete?.(Date.now() - (startTime ?? Date.now()), mistakes);
          }
        }, 220);
      } else {
        setShaking({ x, y });
        setMistakes((m) => m + 1);
        setHearts((h) => Math.max(0, h - 1));
        setTimeout(() => setShaking(null), 320);
      }
    },
    [board, disabled, finished, flying, total, onProgress, onComplete, startTime, mistakes]
  );

  function showHint() {
    if (!board) return;
    const movable = findMovableTiles(board);
    if (movable.length === 0) return;
    const pick = movable[Math.floor(Math.random() * movable.length)];
    setHint({ x: pick.x, y: pick.y });
    setTimeout(() => setHint((h) => (h?.x === pick.x && h?.y === pick.y ? null : h)), 1800);
  }

  const cellPx = useMemo(() => {
    // Responsive cell size: shrink on small screens, cap on large ones.
    if (typeof window === "undefined") return 38;
    const available = Math.min(window.innerWidth - 48, 480);
    return Math.max(24, Math.min(42, Math.floor(available / cols)));
  }, [cols]);

  if (!board) return null;

  return (
    <div className="mx-auto flex flex-col items-center gap-4">
      <div className="flex w-full max-w-md items-center justify-between px-1">
        <div className="flex gap-1">
          {Array.from({ length: maxHearts }).map((_, i) => (
            <span key={i} className={i < hearts ? "opacity-100" : "opacity-20"}>
              ❤️
            </span>
          ))}
        </div>
        <div className="text-sm font-medium text-[var(--ink-dim)]">
          {cleared} / {total} cleared
        </div>
      </div>

      <div
        className="grid select-none touch-none gap-[3px] rounded-2xl border border-[var(--line)] bg-[var(--bg-panel)] p-3"
        style={{
          gridTemplateColumns: `repeat(${cols}, ${cellPx}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellPx}px)`,
        }}
      >
        {board.tiles.flat().map((tile) => {
          const isFlying = flying?.x === tile.x && flying?.y === tile.y;
          const isShaking = shaking?.x === tile.x && shaking?.y === tile.y;
          const isHint = hint?.x === tile.x && hint?.y === tile.y;
          if (!tile.active) return <div key={`${tile.x}-${tile.y}`} style={{ width: cellPx, height: cellPx }} />;
          if (!tile.present && !isFlying)
            return <div key={`${tile.x}-${tile.y}`} style={{ width: cellPx, height: cellPx }} />;

          let translate = "translate(0,0)";
          if (isFlying) {
            const [dx, dy] = DELTA[flying.dir];
            translate = `translate(${dx * cellPx * (cols + rows)}px, ${dy * cellPx * (cols + rows)}px)`;
          }

          return (
            <button
              key={`${tile.x}-${tile.y}`}
              onClick={() => handleTap(tile.x, tile.y)}
              disabled={disabled || finished}
              className={`flex items-center justify-center rounded-md text-sm font-bold transition-transform ${
                isShaking ? "animate-[shake_0.32s_ease-in-out]" : ""
              }`}
              style={{
                width: cellPx,
                height: cellPx,
                fontSize: cellPx * 0.5,
                background: isHint ? "rgba(255,180,84,0.25)" : "var(--bg-panel-raised)",
                color: isHint ? "var(--spark)" : "var(--ink)",
                border: `1px solid ${isHint ? "var(--spark)" : "var(--line)"}`,
                transform: translate,
                transition: isFlying ? "transform 0.22s cubic-bezier(.4,0,.6,1)" : undefined,
                zIndex: isFlying ? 10 : 1,
                position: "relative",
              }}
            >
              {tile.dir ? ARROW_GLYPH[tile.dir] : ""}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={showHint} className="btn btn-ghost !py-1.5 !px-3 text-sm" disabled={finished}>
          ⚡ Hint
        </button>
        <span className="text-xs text-[var(--ink-dim)]">Mistakes: {mistakes}</span>
      </div>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
