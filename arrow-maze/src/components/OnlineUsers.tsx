"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export interface OnlineProfile {
  id: string;
  username: string;
  rating: number;
  avatar_color: string;
  status: "online" | "offline" | "in_game";
}

export default function OnlineUsers({
  onSelect,
  onChallenge,
}: {
  onSelect: (p: OnlineProfile) => void;
  onChallenge: (p: OnlineProfile) => void;
}) {
  const { user } = useAuth();
  const supabase = createClient();
  const [users, setUsers] = useState<OnlineProfile[]>([]);

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("id,username,rating,avatar_color,status")
      .neq("status", "offline")
      .neq("id", user?.id ?? "")
      .order("status")
      .limit(50);
    setUsers((data as OnlineProfile[]) ?? []);
  }

  useEffect(() => {
    if (!user) return;
    load();
    const channel = supabase
      .channel("presence-list")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, () => load())
      .subscribe();
    const interval = setInterval(load, 15_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between px-1 pb-3">
        <h3 className="text-sm font-semibold">Online now</h3>
        <span className="text-xs text-[var(--ink-dim)]">{users.length}</span>
      </div>
      <div className="max-h-80 space-y-1 overflow-y-auto">
        {users.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-lg px-2 py-2 hover:bg-[var(--bg-panel-raised)]">
            <button onClick={() => onSelect(u)} className="flex flex-1 items-center gap-2 text-left">
              <span
                className="status-dot"
                style={{ background: u.status === "in_game" ? "var(--spark)" : "var(--trail)" }}
              />
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ background: u.avatar_color, color: "#05070c" }}
              >
                {u.username.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm">{u.username}</span>
              <span className="text-xs text-[var(--ink-dim)]">· {u.rating}</span>
            </button>
            <button onClick={() => onChallenge(u)} className="btn btn-ghost !px-2 !py-1 text-xs">
              Challenge
            </button>
          </div>
        ))}
        {users.length === 0 && <p className="px-2 py-4 text-sm text-[var(--ink-dim)]">Nobody online right now.</p>}
      </div>
    </div>
  );
}
