"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";
import OnlineUsers, { type OnlineProfile } from "@/components/OnlineUsers";
import Chat from "@/components/Chat";

interface SearchResult {
  id: string;
  username: string;
  rating: number;
  avatar_color: string;
}

export default function ArenaPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selected, setSelected] = useState<OnlineProfile | SearchResult | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,username,rating,avatar_color")
        .ilike("username", `%${query.trim()}%`)
        .neq("id", user?.id ?? "")
        .limit(10);
      setResults((data as SearchResult[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [query, supabase, user]);

  async function sendChallenge(targetId: string) {
    if (!user) return;
    await supabase.from("challenges").insert({ from_user: user.id, to_user: targetId, status: "pending" });
    setSentTo(targetId);
    setTimeout(() => setSentTo(null), 3000);
  }

  if (loading || !user) return <div className="p-10 text-center text-[var(--ink-dim)]">Loading…</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="display text-2xl font-bold md:text-3xl">Arena</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Find a player, send a race challenge, or drop them a message.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="space-y-6">
          <div className="panel p-4">
            <label className="text-sm font-semibold">Search by username</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. mazerunner"
              className="mt-2 w-full"
            />
            {results.length > 0 && (
              <div className="mt-3 space-y-1">
                {results.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--bg-panel-raised)]">
                    <button onClick={() => setSelected(r)} className="flex items-center gap-2 text-left">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: r.avatar_color, color: "#05070c" }}
                      >
                        {r.username.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm">{r.username}</span>
                      <span className="text-xs text-[var(--ink-dim)]">· {r.rating}</span>
                    </button>
                    <button onClick={() => sendChallenge(r.id)} className="btn btn-ghost !px-2 !py-1 text-xs">
                      {sentTo === r.id ? "Sent ✓" : "Challenge"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <OnlineUsers onSelect={setSelected} onChallenge={(p) => sendChallenge(p.id)} />
        </div>

        <div>
          {selected ? (
            <Chat key={selected.id} peerId={selected.id} title={`Chat with ${selected.username}`} />
          ) : (
            <div className="panel flex h-96 items-center justify-center p-6 text-center text-sm text-[var(--ink-dim)]">
              Pick a player from search or the online list to open a chat, or send a race challenge.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
