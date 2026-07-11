import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 48h 匿名对话（v2 §6.4）。
// 只能由系统发起：入口是"系统检测到的高相似匹配"，用户不能挑人搭话。
// 本接口做的是：对当前用户最近的梦，找 24h 内相似度最高的另一个人的梦，
// 找到/创建这一对的会话，并记录本方同意。双方都同意才开启，48h 后关闭。
// 响应中永远不包含对方的任何身份信息。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = body.userId;
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();

    // 我的最近一个有向量的梦
    const { data: mine } = await db
      .from("dreams")
      .select("id, embedding")
      .eq("user_id", userId)
      .not("embedding", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!mine) {
      return NextResponse.json({ error: "no dream yet" }, { status: 404 });
    }

    // 系统匹配：24h 内、非本人、相似度最高
    const { data: matches, error: mErr } = await db.rpc("match_dreams", {
      query_embedding: mine.embedding,
      match_count: 5,
      exclude_user: userId,
      min_similarity: 0.85,
    });
    if (mErr) throw new Error(mErr.message);
    const partner = (matches ?? []).find(
      (m: { user_id: string | null }) => m.user_id,
    );
    if (!partner) {
      return NextResponse.json({ error: "no match" }, { status: 404 });
    }

    // 这一对梦的会话（方向无关，统一排序）
    const [a, b] =
      mine.id < partner.dream_id
        ? [
            { dream: mine.id, user: userId },
            { dream: partner.dream_id, user: partner.user_id },
          ]
        : [
            { dream: partner.dream_id, user: partner.user_id },
            { dream: mine.id, user: userId },
          ];

    let { data: conv } = await db
      .from("conversations")
      .select("*")
      .eq("dream_a", a.dream)
      .eq("dream_b", b.dream)
      .maybeSingle();

    if (!conv) {
      const { data: created, error: cErr } = await db
        .from("conversations")
        .insert({
          dream_a: a.dream,
          dream_b: b.dream,
          user_a: a.user,
          user_b: b.user,
        })
        .select()
        .single();
      if (cErr) throw new Error(cErr.message);
      conv = created;
    }

    // 记录本方同意
    const side = conv.user_a === userId ? "a" : "b";
    const consentField = side === "a" ? "consent_a" : "consent_b";
    if (!conv[consentField]) {
      const patch: Record<string, unknown> = { [consentField]: true };
      const otherConsent = side === "a" ? conv.consent_b : conv.consent_a;
      if (otherConsent) {
        patch.opened_at = new Date().toISOString();
        patch.expires_at = new Date(Date.now() + 48 * 3600_000).toISOString();
      }
      const { data: updated, error: uErr } = await db
        .from("conversations")
        .update(patch)
        .eq("id", conv.id)
        .select()
        .single();
      if (uErr) throw new Error(uErr.message);
      conv = updated;
    }

    return NextResponse.json({
      conversationId: conv.id,
      opened: Boolean(conv.opened_at),
      // 对方是否已同意只以布尔透出，不含任何身份信息
      waitingForOther: !conv.opened_at,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
