"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import MazeBoard from "@/components/MazeBoard";

interface Level {
  id: number;
  index: number;
  seed: string;
  cols: number;
  rows: number;
  difficulty: string;
  par_seconds: number;
}

export default function PlayLevelPage() {
  const { levelId } = useParams<{ levelId: string }>();
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [level, setLevel] = useState<Level | null>(null);
  const [result, setResult] = useState<{ timeMs: number; moves: number; stars: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    supabase
      .from("levels")
      .select("*")
      .eq("id", levelId)
      .single()
      .then(({ data }) => setLevel(data as Level));
  }, [levelId, supabase]);

  function starsFor(timeMs: number) {
    if (!level) return 1;
    const seconds = timeMs / 1000;
    if (seconds <= level.par_seconds * 0.7) return 3;
    if (seconds <= level.par_seconds * 1.15) return 2;
    return 1;
  }

  async function handleComplete(timeMs: number, moves: number) {
    if (!level || !user) return;
    const stars = starsFor(timeMs);
    setResult({ timeMs, moves, stars });
    setSaving(true);

    await supabase
      .from("scores")
      .upsert(
        { user_id: user.id, level_id: level.id, time_ms: Math.round(timeMs), stars, mistakes: 0 },
        { onConflict: "user_id,level_id" }
      );

    if (level.index > (profile?.best_level ?? 0)) {
      await supabase.from("profiles").update({ best_level: level.index }).eq("id", user.id);
      await refreshProfile();
    }
    setSaving(false);
  }

  if (loading || !level) return <div className="p-10 text-center text-[var(--ink-dim)]">Loading level…</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]">
            ← All levels
          </Link>
          <h1 className="display mt-1 text-2xl font-bold">
            Level {level.index} <span className="text-sm font-normal text-[var(--ink-dim)]">· {level.difficulty}</span>
          </h1>
        </div>
        <div className="text-sm text-[var(--ink-dim)]">Par {level.par_seconds}s</div>
      </div>

      <MazeBoard
        key={level.id}
        seed={level.seed}
        cols={level.cols}
        rows={level.rows}
        onComplete={handleComplete}
        disabled={!!result}
      />

      {result && (
        <div className="panel mt-6 flex flex-col items-center gap-2 p-6 text-center">
          <div className="text-3xl">{"★".repeat(result.stars) + "☆".repeat(3 - result.stars)}</div>
          <p className="display text-xl font-bold">
            {(result.timeMs / 1000).toFixed(1)}s · {result.moves} moves
          </p>
          <p className="text-sm text-[var(--ink-dim)]">{saving ? "Saving…" : "Saved to your profile"}</p>
          <div className="mt-2 flex gap-3">
            <Link href="/dashboard" className="btn btn-ghost">
              Back to levels
            </Link>
            <Link href={`/play/${level.id + 1}`} className="btn btn-primary">
              Next level →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
