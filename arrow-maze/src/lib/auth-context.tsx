"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_color: string;
  rating: number;
  wins: number;
  losses: number;
  best_level: number;
  status: "online" | "offline" | "in_game";
}

interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(userId: string) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data as Profile);
  }

  async function refreshProfile() {
    if (user) await loadProfile(user.id);
  }

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) await loadProfile(data.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user.id);
        // mark online + heartbeat
        await supabase
          .from("profiles")
          .update({ status: "online", last_seen: new Date().toISOString() })
          .eq("id", session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat: keep "online" status fresh every 30s while the tab is open,
  // and flip back to "offline" when the tab closes.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      supabase
        .from("profiles")
        .update({ status: "online", last_seen: new Date().toISOString() })
        .eq("id", user.id)
        .then(() => {});
    }, 30_000);

    const handleUnload = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/presence/offline",
          new Blob([JSON.stringify({ id: user.id })], { type: "application/json" })
        );
      }
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [user, supabase]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
