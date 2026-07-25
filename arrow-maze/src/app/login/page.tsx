"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="panel p-8">
        <h1 className="display text-2xl font-bold">Welcome back</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">Log in to keep your streak alive.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
            />
          </label>

          {error && (
            <p
              className="rounded-lg bg-[rgba(255,107,129,0.1)] px-3 py-2 text-sm"
              style={{ color: "var(--danger)" }}
            >
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--ink-dim)]">
          New here?{" "}
          <Link href="/signup" className="font-medium" style={{ color: "var(--volt)" }}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
