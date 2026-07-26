import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.db
    .from("dreams")
    .select(
      "id, raw_text, emotion_score, lucidity, is_recurring, visibility, is_night_mode, created_at, dream_motifs(weight, motifs(name))",
    )
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const dreams = (data ?? []).map((dream) => ({
    ...dream,
    motifs: (dream.dream_motifs ?? [])
      .sort((a, b) => b.weight - a.weight)
      .map((link) => (link.motifs as unknown as { name: string } | null)?.name)
      .filter(Boolean),
    dream_motifs: undefined,
  }));

  return NextResponse.json({ dreams });
}

