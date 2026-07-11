import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { MATCH_THRESHOLD } from "@/lib/match";

// 产品心跳（v2 §6.2）：24 小时内相似度超过阈值的梦有多少个。
// count 为 0 时前端不展示（不推送"有 0 个人"）。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data: dream, error } = await db
      .from("dreams")
      .select("embedding")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }
    if (!dream.embedding) return NextResponse.json({ count: 0, motif: null });

    const { data: count, error: rpcErr } = await db.rpc(
      "count_recent_similar",
      {
        query_embedding: dream.embedding,
        self_dream: id,
        min_similarity: MATCH_THRESHOLD,
      },
    );
    if (rpcErr) throw new Error(rpcErr.message);

    // 该梦权重最高的意象，作为推送里的主题词（如「坠落」）
    const { data: motifRow } = await db
      .from("dream_motifs")
      .select("weight, motifs(name)")
      .eq("dream_id", id)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle();

    const motifs = motifRow?.motifs as { name: string } | { name: string }[] | null;
    const motif = Array.isArray(motifs) ? motifs[0]?.name : motifs?.name;

    return NextResponse.json({ count: count ?? 0, motif: motif ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
