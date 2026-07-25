"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

const COLORS = ["#7c8cff", "#5ee6c9", "#ffb454", "#ff6b81", "#c084fc", "#38bdf8"];

export default function ProfilePage() {
  const { user, profile, loading, refreshProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setColor(profile.avatar_color);
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    await supabase.from("profiles").update({ display_name: displayName, avatar_color: color }).eq("id", user.id);
    await refreshProfile();
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  if (loading || !profile) return <div className="p-10 text-center text-[var(--ink-dim)]">Loading…</div>;

  const total = profile.wins + profile.losses;
  const winRate = total ? Math.round((profile.wins / total) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="display text-2xl font-bold md:text-3xl">Your profile</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Rating" value={profile.rating} />
        <Stat label="Win rate" value={`${winRate}%`} sub={`${profile.wins}W · ${profile.losses}L`} />
        <Stat label="Best level" value={profile.best_level} />
      </div>

      <div className="panel mt-6 p-6">
        <h2 className="display text-lg font-semibold">Edit profile</h2>
        <div className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Username (fixed)
            <input value={profile.username} disabled />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Display name
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Shown to others" />
          </label>
          <div>
            <span className="text-sm font-medium">Avatar color</span>
            <div className="mt-2 flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="h-8 w-8 rounded-full border-2"
                  style={{ background: c, borderColor: c === color ? "var(--ink)" : "transparent" }}
                  aria-label={`Choose ${c}`}
                />
              ))}
            </div>
          </div>
          <button onClick={save} className="btn btn-primary self-start">
            {saved ? "Saved ✓" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-[var(--ink-dim)]">{label}</div>
      <div className="display mt-1 text-2xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-[var(--ink-dim)]">{sub}</div>}
    </div>
  );
}
