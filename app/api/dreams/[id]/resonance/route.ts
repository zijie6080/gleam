import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { matchDream } from "@/lib/matching";

// 梦境详情的心跳数据（v2 混合打分 + 分层 + 跨时间降级）。
// strong/weak 都为 0 时前端不展示。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data: dream, error } = await db
      .from("dreams")
      .select("id, user_id, embedding, emotion_score, is_night_mode")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }
    if (!dream.embedding || dream.is_night_mode) {
      return NextResponse.json({ strong: 0, weak: 0, motif: null, window: "today" });
    }

    const tier = await matchDream(dream);
    return NextResponse.json({
      strong: tier.strong.length,
      weak: tier.weak.length,
      motif: tier.motif,
      window: tier.window,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
