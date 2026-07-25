"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setError("Username must be 3–20 characters: letters, numbers, underscore only.");
      return;
    }

    setLoading(true);
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) {
      setError("That username is already taken.");
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="panel p-8">
          <h1 className="display text-2xl font-bold">Check your inbox</h1>
          <p className="mt-3 text-sm text-[var(--ink-dim)]">
            We sent a confirmation link to <strong>{email}</strong>. Confirm it, then log in to
            start racing.
          </p>
          <Link href="/login" className="btn btn-primary mt-6">
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <div className="panel p-8">
        <h1 className="display text-2xl font-bold">Create your account</h1>
        <p className="mt-1 text-sm text-[var(--ink-dim)]">Free forever. No downloads.</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Username
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mazerunner"
              required
              minLength={3}
              maxLength={20}
            />
          </label>
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
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-[rgba(255,107,129,0.1)] px-3 py-2 text-sm" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary mt-2">
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--ink-dim)]">
          Already have an account?{" "}
          <Link href="/login" className="font-medium" style={{ color: "var(--volt)" }}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
