"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Message {
  id: string;
  from_user: string;
  to_user: string | null;
  match_id: string | null;
  body: string;
  created_at: string;
}

interface ChatProps {
  /** Either a DM peer (direct message thread) or a match id (in-race chat). */
  peerId?: string;
  matchId?: string;
  title?: string;
  compact?: boolean;
}

export default function Chat({ peerId, matchId, title = "Chat", compact }: ChatProps) {
  const { user } = useAuth();
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    let query = supabase.from("messages").select("*").order("created_at", { ascending: true }).limit(100);

    if (matchId) {
      query = query.eq("match_id", matchId);
    } else if (peerId) {
      query = query.is("match_id", null).or(
        `and(from_user.eq.${user.id},to_user.eq.${peerId}),and(from_user.eq.${peerId},to_user.eq.${user.id})`
      );
    } else {
      return;
    }

    query.then(({ data }) => setMessages((data as Message[]) ?? []));

    const channel = supabase
      .channel(`chat-${matchId ?? peerId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as Message;
          if (matchId) {
            if (row.match_id !== matchId) return;
          } else if (peerId) {
            const isThisThread =
              !row.match_id &&
              ((row.from_user === user.id && row.to_user === peerId) ||
                (row.from_user === peerId && row.to_user === user.id));
            if (!isThisThread) return;
          }
          setMessages((prev) => [...prev, row]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, peerId, matchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!body.trim() || !user) return;
    await supabase.from("messages").insert({
      from_user: user.id,
      to_user: matchId ? null : peerId,
      match_id: matchId ?? null,
      body: body.trim(),
    });
    setBody("");
  }

  return (
    <div className={`panel flex flex-col ${compact ? "h-64" : "h-96"}`}>
      <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-semibold">{title}</div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {messages.length === 0 && <p className="text-sm text-[var(--ink-dim)]">No messages yet — say hi 👋</p>}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.from_user === user?.id ? "justify-end" : "justify-start"}`}>
            <span
              className="max-w-[80%] rounded-xl px-3 py-1.5 text-sm"
              style={{
                background: m.from_user === user?.id ? "var(--volt)" : "var(--bg-panel-raised)",
                color: m.from_user === user?.id ? "#05070c" : "var(--ink)",
              }}
            >
              {m.body}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="flex gap-2 border-t border-[var(--line)] p-3"
      >
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          maxLength={500}
          className="flex-1"
        />
        <button type="submit" className="btn btn-primary !px-3">
          Send
        </button>
      </form>
    </div>
  );
}
