import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 广场点赞（心形）。与「我也是」不同：这是普通点赞，可撤销。
// 「我也是」= 我也梦见过这个（不可撤销、匿名聚合）；点赞 = 写得好。

async function countFor(dreamId: string, userId?: string) {
  const db = supabaseAdmin();
  const { count, error } = await db
    .from("dream_likes")
    .select("dream_id", { count: "exact", head: true })
    .eq("dream_id", dreamId);
  if (error) throw new Error(error.message);
  let liked = false;
  if (userId) {
    const { data } = await db
      .from("dream_likes")
      .select("dream_id")
      .eq("dream_id", dreamId)
      .eq("user_id", userId)
      .maybeSingle();
    liked = Boolean(data);
  }
  return { count: count ?? 0, liked };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId") ?? undefined;
  try {
    return NextResponse.json(await countFor(id, userId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST body: { userId } — 切换点赞状态
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (typeof body.userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    const { data: existing } = await db
      .from("dream_likes")
      .select("dream_id")
      .eq("dream_id", id)
      .eq("user_id", body.userId)
      .maybeSingle();

    if (existing) {
      await db
        .from("dream_likes")
        .delete()
        .eq("dream_id", id)
        .eq("user_id", body.userId);
    } else {
      await db
        .from("dream_likes")
        .insert({ dream_id: id, user_id: body.userId });
    }
    return NextResponse.json(await countFor(id, body.userId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
