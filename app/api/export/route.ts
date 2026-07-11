import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 一键导出全部数据（v2 §7.2）：该匿名 ID 名下的梦、意象、故事
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    const { data: dreams, error } = await db
      .from("dreams")
      .select(
        "id, raw_text, emotion_score, lucidity, is_recurring, visibility, is_night_mode, created_at, dream_motifs(weight, motifs(name, category))",
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    const ids = (dreams ?? []).map((d) => d.id);
    let stories: unknown[] = [];
    if (ids.length > 0) {
      const { data } = await db
        .from("stories")
        .select("dream_id, content, created_at")
        .in("dream_id", ids);
      stories = data ?? [];
    }

    return new NextResponse(
      JSON.stringify({ exported_at: new Date(), dreams, stories }, null, 2),
      {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": 'attachment; filename="gleam-dreams.json"',
        },
      },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
