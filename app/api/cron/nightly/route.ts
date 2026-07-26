import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";
import { matchDream } from "@/lib/matching";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET 未配置" },
      { status: 503 },
    );
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const stats = { matched: 0, notified: 0, pushed: 0, pushFailed: 0 };

  try {
    const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
    const { data: recent } = await db
      .from("dreams")
      .select("id, user_id, embedding, emotion_score")
      .gte("created_at", since)
      .not("embedding", "is", null)
      .not("user_id", "is", null)
      .eq("is_night_mode", false)
      .limit(200);

    const notifyUsers = new Set<string>();
    for (const dream of recent ?? []) {
      const tier = await matchDream(dream);
      if (tier.strong.length === 0) continue;
      stats.matched++;
      notifyUsers.add(dream.user_id!);
      for (const match of tier.strong) {
        if (match.user_id) notifyUsers.add(match.user_id);
      }
    }

    for (const userId of notifyUsers) {
      const { data: existing } = await db
        .from("notifications")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "resonance")
        .eq("read", false)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await db
          .from("notifications")
          .insert({ user_id: userId, type: "resonance", payload: {} });
        stats.notified++;
      }
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (publicKey && privateKey) {
      webpush.setVapidDetails("mailto:zijie6080@gmail.com", publicKey, privateKey);
      const { data: unread } = await db
        .from("notifications")
        .select("user_id")
        .eq("type", "resonance")
        .eq("read", false);
      const userIds = [...new Set((unread ?? []).map((item) => item.user_id))];
      if (userIds.length > 0) {
        const { data: subscriptions } = await db
          .from("push_subscriptions")
          .select("endpoint, user_id, keys")
          .in("user_id", userIds);
        const pushed = new Set<string>();
        for (const subscription of subscriptions ?? []) {
          if (pushed.has(subscription.user_id)) continue;
          try {
            await webpush.sendNotification(
              {
                endpoint: subscription.endpoint,
                keys: subscription.keys as { p256dh: string; auth: string },
              },
              JSON.stringify({
                title: "拾梦",
                body: "昨晚，有人和你梦见了同一件事。",
                url: "/plaza",
              }),
            );
            pushed.add(subscription.user_id);
            stats.pushed++;
          } catch {
            await db
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", subscription.endpoint);
            stats.pushFailed++;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
