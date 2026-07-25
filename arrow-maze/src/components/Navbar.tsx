"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

export default function Navbar() {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/dashboard", label: "Levels" },
    { href: "/arena", label: "Arena" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  async function signOut() {
    if (user) {
      await supabase.from("profiles").update({ status: "offline" }).eq("id", user.id);
    }
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="display flex items-center gap-2 text-lg font-bold">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ background: "linear-gradient(135deg, var(--volt), var(--trail))", color: "#05070c" }}
          >
            ↗
          </span>
          Arrow Trail
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {user &&
            links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? "bg-[var(--bg-panel-raised)] text-[var(--ink)]"
                    : "text-[var(--ink-dim)] hover:text-[var(--ink)]"
                }`}
              >
                {l.label}
              </Link>
            ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user && profile ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg-panel-raised)]">
                <span className="status-dot" style={{ background: "var(--trail)" }} />
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: profile.avatar_color, color: "#05070c" }}
                >
                  {profile.username.slice(0, 2).toUpperCase()}
                </span>
                <span className="text-sm font-medium">{profile.username}</span>
              </Link>
              <button onClick={signOut} className="btn btn-ghost !px-3 !py-1.5 text-sm">
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !px-3 !py-1.5 text-sm">
                Log in
              </Link>
              <Link href="/signup" className="btn btn-primary !px-3 !py-1.5 text-sm">
                Sign up free
              </Link>
            </>
          )}
        </div>

        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--line)] md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {user &&
              links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--bg-panel-raised)]">
                  {l.label}
                </Link>
              ))}
            {user ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-[var(--bg-panel-raised)]">
                  Profile ({profile?.username})
                </Link>
                <button onClick={signOut} className="btn btn-ghost mt-1 justify-start text-sm">
                  Sign out
                </button>
              </>
            ) : (
              <div className="mt-1 flex gap-2">
                <Link href="/login" onClick={() => setOpen(false)} className="btn btn-ghost flex-1 text-sm">
                  Log in
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)} className="btn btn-primary flex-1 text-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
