import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { matchLatestFor } from "@/lib/matching";

// 48h 匿名对话。只能由系统发起——入口是强匹配（同梦），弱匹配不开对话。
// 双方同意才开启；响应永远不含对方身份。
// 限速：每用户每天最多发起 3 次（反滥用）。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = body.userId;
  if (typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();

    // 限速：今天由我发起同意的会话数
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: initiated } = await db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .or(`and(user_a.eq.${userId},consent_a.eq.true),and(user_b.eq.${userId},consent_b.eq.true)`)
      .gte("created_at", today.toISOString());
    if ((initiated ?? 0) >= 3) {
      return NextResponse.json(
        { error: "今天发起的对话够多了，明天再来。" },
        { status: 429 },
      );
    }

    // 强匹配才有对话资格
    const tier = await matchLatestFor(userId);
    const partner = tier?.strong.find((s) => s.user_id);
    if (!tier || !partner) {
      return NextResponse.json({ error: "no match" }, { status: 404 });
    }

    const mineDream = tier.dreamId;
    const [a, b] =
      mineDream < partner.dream_id
        ? [
            { dream: mineDream, user: userId },
            { dream: partner.dream_id, user: partner.user_id! },
          ]
        : [
            { dream: partner.dream_id, user: partner.user_id! },
            { dream: mineDream, user: userId },
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
      waitingForOther: !conv.opened_at,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
