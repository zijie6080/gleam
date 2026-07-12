import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { MATCH_THRESHOLD } from "@/lib/match";

// 广场顶部匹配横幅数据：对当前用户最近一个梦，算 24h 内相似梦数 + 主题意象。
// ?userId= 匿名设备 ID / 账号 ID。count 为 0 时前端不显示横幅。
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    const db = supabaseAdmin();
    let q = db
      .from("dreams")
      .select("id, embedding")
      .not("embedding", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    if (userId) q = q.eq("user_id", userId);
    const { data: latest } = await q.maybeSingle();

    if (!latest) return NextResponse.json({ count: 0, motif: null });

    const { data: count } = await db.rpc("count_recent_similar", {
      query_embedding: latest.embedding,
      self_dream: latest.id,
      min_similarity: MATCH_THRESHOLD,
    });

    const { data: motifRow } = await db
      .from("dream_motifs")
      .select("weight, motifs(name)")
      .eq("dream_id", latest.id)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle();
    const m = motifRow?.motifs as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    const motif = (Array.isArray(m) ? m[0]?.name : m?.name) ?? null;

    return NextResponse.json({ count: count ?? 0, motif });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
