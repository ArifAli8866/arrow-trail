"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface IncomingChallenge {
  id: string;
  from_user: string;
  fromUsername: string;
}

export default function ChallengeListener() {
  const { user } = useAuth();
  const supabase = createClient();
  const router = useRouter();
  const [incoming, setIncoming] = useState<IncomingChallenge | null>(null);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("challenges-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "challenges" },
        async (payload) => {
          const row = payload.new as { id: string; from_user: string; to_user: string };
          if (row.to_user !== user.id) return;
          const { data: fromProfile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", row.from_user)
            .single();
          setIncoming({ id: row.id, from_user: row.from_user, fromUsername: fromProfile?.username ?? "Someone" });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "challenges" },
        (payload) => {
          const row = payload.new as { id: string; from_user: string; status: string; match_id: string | null };
          // I'm the challenger and my invite just got accepted -> jump into the match.
          if (row.from_user === user.id && row.status === "accepted" && row.match_id) {
            router.push(`/match/${row.match_id}`);
          }
          if (incoming && row.id === incoming.id && row.status !== "pending") {
            setIncoming(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function respond(accept: boolean) {
    if (!incoming || !user) return;
    if (!accept) {
      await supabase.from("challenges").update({ status: "declined" }).eq("id", incoming.id);
      setIncoming(null);
      return;
    }

    const seed = `${incoming.id}-${Date.now()}`;
    const { data: match, error } = await supabase
      .from("matches")
      .insert({ player_one: incoming.from_user, player_two: user.id, seed, cols: 9, rows: 13 })
      .select()
      .single();

    if (!error && match) {
      await supabase.from("challenges").update({ status: "accepted", match_id: match.id }).eq("id", incoming.id);
      setIncoming(null);
      router.push(`/match/${match.id}`);
    }
  }

  if (!incoming) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="panel w-full max-w-sm p-6 text-center">
        <div className="text-3xl">⚔️</div>
        <h3 className="display mt-2 text-lg font-bold">{incoming.fromUsername} challenged you</h3>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">Race live, head to head, same maze.</p>
        <div className="mt-5 flex justify-center gap-3">
          <button onClick={() => respond(false)} className="btn btn-ghost">
            Decline
          </button>
          <button onClick={() => respond(true)} className="btn btn-primary">
            Accept race
          </button>
        </div>
      </div>
    </div>
  );
}
