import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function requireDreamOwner(req: NextRequest, dreamId: string) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;

  const { data: dream } = await auth.db
    .from("dreams")
    .select("id, user_id, raw_text, is_night_mode")
    .eq("id", dreamId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!dream) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "没有找到这个梦" }, { status: 404 }),
    };
  }
  return { ...auth, dream };
}
