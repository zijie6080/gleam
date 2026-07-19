import { NextRequest, NextResponse } from "next/server";
import { matchLatestFor } from "@/lib/matching";

// 广场顶部匹配数据（v2 混合打分 + 分层 + 跨时间降级）。
// strong: 同梦数（可开对话）；weak: 相似意象数（安静展示）；
// window: today/month/ever 决定文案（今晚/这个月/曾经）。
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ strong: 0, weak: 0, motif: null, window: "today" });
  }
  try {
    const tier = await matchLatestFor(userId);
    if (!tier) {
      return NextResponse.json({ strong: 0, weak: 0, motif: null, window: "today" });
    }
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
