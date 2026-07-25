"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/auth-context";

interface Row {
  id: string;
  username: string;
  rating: number;
  wins: number;
  losses: number;
  best_level: number;
  avatar_color: string;
}

export default function LeaderboardPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("id,username,rating,wins,losses,best_level,avatar_color")
      .order("rating", { ascending: false })
      .limit(50)
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, [supabase]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="display text-2xl font-bold md:text-3xl">Leaderboard</h1>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">Ranked by rating. Win races to climb.</p>

      <div className="panel mt-6 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-left text-[var(--ink-dim)]">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3 text-right">Rating</th>
              <th className="px-4 py-3 text-right">W / L</th>
              <th className="hidden px-4 py-3 text-right sm:table-cell">Best level</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={r.id}
                className="border-b border-[var(--line)] last:border-0"
                style={{ background: r.id === profile?.id ? "rgba(124,140,255,0.08)" : undefined }}
              >
                <td className="px-4 py-3 text-[var(--ink-dim)]">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: r.avatar_color, color: "#05070c" }}
                    >
                      {r.username.slice(0, 2).toUpperCase()}
                    </span>
                    {r.username}
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{r.rating}</td>
                <td className="px-4 py-3 text-right text-[var(--ink-dim)]">
                  {r.wins} / {r.losses}
                </td>
                <td className="hidden px-4 py-3 text-right text-[var(--ink-dim)] sm:table-cell">{r.best_level}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--ink-dim)]">
                  No players yet — be the first!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
