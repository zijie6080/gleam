import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase";
import { matchDream } from "@/lib/matching";

export const maxDuration = 60;

// 每晚 20:00（北京时间，vercel.json 配 12:00 UTC）：
// 1) 批量补配：过去 24h 的梦互相匹配，给强匹配双方补通知
//    （解决"我先记、对方后记"时我方错过的那一半）
// 2) Web Push：给有未读共鸣通知且订阅了推送的用户各发 1 条
//    推送铁律：只发强匹配、每人每天最多 1 条、只在这个时间窗发
export async function GET(req: NextRequest) {
  // Vercel Cron 自动带 Authorization: Bearer $CRON_SECRET
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const stats = { matched: 0, notified: 0, pushed: 0, pushFailed: 0 };

  try {
    // ---- 1. 批量补配 ----
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    const { data: recent } = await db
      .from("dreams")
      .select("id, user_id, embedding, emotion_score")
      .gte("created_at", since)
      .not("embedding", "is", null)
      .not("user_id", "is", null)
      .eq("is_night_mode", false)
      .limit(200);

    const notifyUsers = new Set<string>();
    for (const d of recent ?? []) {
      const tier = await matchDream(d);
      if (tier.strong.length > 0) {
        stats.matched++;
        notifyUsers.add(d.user_id!); // 补上"我方"的通知
        for (const s of tier.strong) {
          if (s.user_id) notifyUsers.add(s.user_id);
        }
      }
    }

    for (const uid of notifyUsers) {
      const { data: existing } = await db
        .from("notifications")
        .select("id")
        .eq("user_id", uid)
        .eq("type", "resonance")
        .eq("read", false)
        .limit(1)
        .maybeSingle();
      if (!existing) {
        await db
          .from("notifications")
          .insert({ user_id: uid, type: "resonance", payload: {} });
        stats.notified++;
      }
    }

    // ---- 2. Web Push ----
    const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const priv = process.env.VAPID_PRIVATE_KEY;
    if (pub && priv) {
      webpush.setVapidDetails("mailto:zijie6080@gmail.com", pub, priv);

      // 有未读共鸣通知的用户
      const { data: unread } = await db
        .from("notifications")
        .select("user_id")
        .eq("type", "resonance")
        .eq("read", false);
      const userIds = [...new Set((unread ?? []).map((n) => n.user_id))];

      if (userIds.length > 0) {
        const { data: subs } = await db
          .from("push_subscriptions")
          .select("endpoint, user_id, keys")
          .in("user_id", userIds);

        const pushedUsers = new Set<string>();
        for (const sub of subs ?? []) {
          if (pushedUsers.has(sub.user_id)) continue; // 每人每天最多 1 条
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: sub.keys as { p256dh: string; auth: string },
              },
              JSON.stringify({
                title: "拾梦",
                body: "昨晚，有人和你梦见了同一件事。",
                url: "/plaza",
              }),
            );
            pushedUsers.add(sub.user_id);
            stats.pushed++;
          } catch {
            // 订阅失效（410 等）：清掉
            await db
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
            stats.pushFailed++;
          }
        }
      }
    }

    return NextResponse.json({ ok: true, ...stats });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
