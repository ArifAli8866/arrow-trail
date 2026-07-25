"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import MazeBoard from "@/components/MazeBoard";
import Chat from "@/components/Chat";

interface Match {
  id: string;
  player_one: string;
  player_two: string;
  seed: string;
  cols: number;
  rows: number;
  status: "active" | "finished" | "abandoned";
  winner: string | null;
}
interface Progress {
  user_id: string;
  cell_x: number;
  cell_y: number;
  finished_at: string | null;
}
interface OpponentProfile {
  id: string;
  username: string;
  avatar_color: string;
}

export default function MatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [match, setMatch] = useState<Match | null>(null);
  const [opponent, setOpponent] = useState<OpponentProfile | null>(null);
  const [opponentPos, setOpponentPos] = useState<{ x: number; y: number } | null>(null);
  const [opponentFinished, setOpponentFinished] = useState(false);
  const [myResult, setMyResult] = useState<{ timeMs: number } | null>(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()
      .then(({ data }) => setMatch(data as Match));
  }, [matchId, supabase]);

  useEffect(() => {
    if (!match || !user) return;
    const opponentId = match.player_one === user.id ? match.player_two : match.player_one;
    supabase
      .from("profiles")
      .select("id,username,avatar_color")
      .eq("id", opponentId)
      .single()
      .then(({ data }) => setOpponent(data as OpponentProfile));

    // Load any existing progress rows (e.g. on refresh).
    supabase
      .from("match_progress")
      .select("user_id,cell_x,cell_y,finished_at")
      .eq("match_id", match.id)
      .then(({ data }) => {
        const opp = (data as Progress[] | null)?.find((p) => p.user_id === opponentId);
        if (opp) {
          setOpponentPos({ x: opp.cell_x, y: opp.cell_y });
          setOpponentFinished(!!opp.finished_at);
        }
      });

    const channel = supabase
      .channel(`match-${match.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_progress", filter: `match_id=eq.${match.id}` },
        (payload) => {
          const row = payload.new as Progress;
          if (row.user_id !== opponentId) return;
          setOpponentPos({ x: row.cell_x, y: row.cell_y });
          if (row.finished_at) setOpponentFinished(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => setMatch(payload.new as Match)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match?.id, user]);

  async function handleProgress(pos: { x: number; y: number }, _steps: number, atEnd: boolean) {
    if (!match || !user) return;
    await supabase.from("match_progress").upsert(
      {
        match_id: match.id,
        user_id: user.id,
        cell_x: pos.x,
        cell_y: pos.y,
        step: _steps,
        finished_at: atEnd ? new Date().toISOString() : null,
      },
      { onConflict: "match_id,user_id" }
    );
  }

  async function handleComplete(timeMs: number) {
    if (!match || !user || finishedRef.current) return;
    finishedRef.current = true;
    setMyResult({ timeMs });

    // First finisher wins — only write the match result if it's still active.
    const { data: fresh } = await supabase.from("matches").select("status,winner").eq("id", match.id).single();
    if (fresh && fresh.status === "active") {
      await supabase
        .from("matches")
        .update({ status: "finished", winner: user.id, finished_at: new Date().toISOString() })
        .eq("id", match.id);
      const oppId = match.player_one === user.id ? match.player_two : match.player_one;
      const { data: me } = await supabase.from("profiles").select("wins,rating").eq("id", user.id).single();
      const { data: opp } = await supabase.from("profiles").select("losses,rating").eq("id", oppId).single();
      if (me) await supabase.from("profiles").update({ wins: me.wins + 1, rating: me.rating + 20 }).eq("id", user.id);
      if (opp) await supabase.from("profiles").update({ losses: opp.losses + 1, rating: Math.max(0, opp.rating - 15) }).eq("id", oppId);
    }
  }

  if (loading || !match || !opponent) return <div className="p-10 text-center text-[var(--ink-dim)]">Loading race…</div>;

  const iWon = match.status === "finished" && match.winner === user?.id;
  const iLost = match.status === "finished" && match.winner && match.winner !== user?.id;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/arena" className="text-sm text-[var(--ink-dim)] hover:text-[var(--ink)]">
            ← Arena
          </Link>
          <h1 className="display mt-1 text-2xl font-bold">
            {profile?.username} <span className="text-[var(--ink-dim)]">vs</span> {opponent.username}
          </h1>
        </div>
        {match.status === "finished" && (
          <span
            className="rounded-full px-3 py-1 text-sm font-semibold"
            style={{
              background: iWon ? "rgba(94,230,201,0.15)" : "rgba(255,107,129,0.12)",
              color: iWon ? "var(--trail)" : "var(--danger)",
            }}
          >
            {iWon ? "You won 🏆" : iLost ? "Opponent won" : "Race finished"}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <MazeBoard
            key={match.seed}
            seed={match.seed}
            cols={match.cols}
            rows={match.rows}
            onComplete={(timeMs) => handleComplete(timeMs)}
            onProgress={handleProgress}
            opponentCell={opponentPos}
            opponentLabel={opponent.username}
            disabled={match.status === "finished"}
          />
          {myResult && (
            <div className="panel mt-6 p-5 text-center">
              <p className="display text-xl font-bold">You finished in {(myResult.timeMs / 1000).toFixed(1)}s</p>
              <p className="mt-1 text-sm text-[var(--ink-dim)]">
                {opponentFinished ? "Your opponent has finished too." : "Waiting to see if your opponent beats that…"}
              </p>
              <Link href="/arena" className="btn btn-ghost mt-4">
                Back to arena
              </Link>
            </div>
          )}
        </div>

        <Chat matchId={match.id} title="Race chat" compact />
      </div>
    </div>
  );
}
