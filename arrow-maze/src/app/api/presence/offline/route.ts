import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) {
    await supabase
      .from("profiles")
      .update({ status: "offline", last_seen: new Date().toISOString() })
      .eq("id", data.user.id);
  }
  return NextResponse.json({ ok: true });
}
