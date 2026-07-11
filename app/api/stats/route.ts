import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 个人统计：梦境数、被「我也是」总数、近 35 天热力图数据
// ?userId= 匿名设备 ID；不传则返回全站梦境数。任何身份信息不外泄。
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    const db = supabaseAdmin();

    if (!userId) {
      const { count } = await db
        .from("dreams")
        .select("id", { count: "exact", head: true });
      return NextResponse.json({ totalDreams: count ?? 0 });
    }

    const { data: myDreams, error } = await db
      .from("dreams")
      .select("id, emotion_score, created_at")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (myDreams ?? []).map((d) => d.id);

    let iamtooCount = 0;
    if (ids.length > 0) {
      const { count } = await db
        .from("resonances_iamtoo")
        .select("dream_id", { count: "exact", head: true })
        .in("dream_id", ids);
      iamtooCount = count ?? 0;
    }

    // 近 35 天热力图：每天 0–3 档（有梦 +1，负面情绪加档）
    const days: number[] = Array(35).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const d of myDreams ?? []) {
      const dt = new Date(d.created_at);
      dt.setHours(0, 0, 0, 0);
      const diff = Math.round((today.getTime() - dt.getTime()) / 86400000);
      if (diff >= 0 && diff < 35) {
        const idx = 34 - diff;
        const intensity =
          d.emotion_score !== null && Math.abs(d.emotion_score) > 0.5
            ? 3
            : d.emotion_score !== null && Math.abs(d.emotion_score) > 0.2
              ? 2
              : 1;
        days[idx] = Math.min(3, Math.max(days[idx], intensity));
      }
    }

    return NextResponse.json({ dreamCount: ids.length, iamtooCount, days });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
