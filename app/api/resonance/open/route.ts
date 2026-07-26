import { NextRequest, NextResponse } from "next/server";
import { matchLatestFor } from "@/lib/matching";
import { requireUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  const { db, user } = auth;
  const userId = user.id;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: initiated } = await db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .or(
        `and(user_a.eq.${userId},consent_a.eq.true),and(user_b.eq.${userId},consent_b.eq.true)`,
      )
      .gte("created_at", today.toISOString());
    if ((initiated ?? 0) >= 3) {
      return NextResponse.json(
        { error: "今天发起的对话够多了，明天再来。" },
        { status: 429 },
      );
    }

    const tier = await matchLatestFor(userId);
    const partner = tier?.strong.find((match) => match.user_id);
    if (!tier || !partner) {
      return NextResponse.json({ error: "暂时没有强匹配" }, { status: 404 });
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

    let { data: conversation } = await db
      .from("conversations")
      .select("*")
      .eq("dream_a", a.dream)
      .eq("dream_b", b.dream)
      .maybeSingle();
    if (!conversation) {
      const { data, error } = await db
        .from("conversations")
        .insert({
          dream_a: a.dream,
          dream_b: b.dream,
          user_a: a.user,
          user_b: b.user,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      conversation = data;
    }

    const side = conversation.user_a === userId ? "a" : "b";
    const consentField = side === "a" ? "consent_a" : "consent_b";
    if (!conversation[consentField]) {
      const patch: Record<string, unknown> = { [consentField]: true };
      const otherConsent =
        side === "a" ? conversation.consent_b : conversation.consent_a;
      if (otherConsent) {
        patch.opened_at = new Date().toISOString();
        patch.expires_at = new Date(Date.now() + 48 * 3_600_000).toISOString();
      }
      const { data, error } = await db
        .from("conversations")
        .update(patch)
        .eq("id", conversation.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      conversation = data;
    }

    return NextResponse.json({
      conversationId: conversation.id,
      opened: Boolean(conversation.opened_at),
      waitingForOther: !conversation.opened_at,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
