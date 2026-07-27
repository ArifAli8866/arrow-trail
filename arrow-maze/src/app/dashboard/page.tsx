"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Level {
  id: number;
  index: number;
  difficulty: string;
  par_seconds: number;
}
interface ScoreRow {
  level_id: number;
  time_ms: number;
  stars: number;
}

const DIFF_COLOR: Record<string, string> = {
  easy: "var(--trail)",
  medium: "var(--volt)",
  hard: "var(--spark)",
  expert: "var(--danger)",
};

export default function DashboardPage() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [levels, setLevels] = useState<Level[]>([]);
  const [scores, setScores] = useState<Record<number, ScoreRow>>({});

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("levels")
      .select("id,index,difficulty,par_seconds")
      .order("index")
      .then(({ data }) => setLevels((data as Level[]) ?? []));

    supabase
      .from("scores")
      .select("level_id,time_ms,stars")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const map: Record<number, ScoreRow> = {};
        (data as ScoreRow[] | null)?.forEach((s) => (map[s.level_id] = s));
        setScores(map);
      });
  }, [user, supabase]);

  if (loading || !user) return <div className="p-10 text-center text-[var(--ink-dim)]">Loading…</div>;

  const unlockedIndex = (profile?.best_level ?? 0) + 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="display text-2xl font-bold md:text-3xl">Levels</h1>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Clear every arrow to unlock the next level. Higher levels pack in more tiles.
          </p>
        </div>
        <Link href="/arena" className="btn btn-primary hidden sm:inline-flex">
          Race someone instead →
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {levels.map((lvl) => {
          const locked = lvl.index > unlockedIndex;
          const score = scores[lvl.id];
          return (
            <Link
              key={lvl.id}
              href={locked ? "#" : `/play/${lvl.id}`}
              aria-disabled={locked}
              className={`panel flex flex-col gap-2 p-4 transition-transform ${
                locked ? "pointer-events-none opacity-40" : "hover:-translate-y-0.5"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="display text-xl font-bold">{lvl.index}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                  style={{ color: DIFF_COLOR[lvl.difficulty], background: "rgba(255,255,255,0.05)" }}
                >
                  {lvl.difficulty}
                </span>
              </div>
              <div className="text-xs text-[var(--ink-dim)]">Par {lvl.par_seconds}s</div>
              <div className="text-sm">
                {locked ? "🔒 Locked" : score ? "★".repeat(score.stars) + "☆".repeat(3 - score.stars) : "Not played"}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
