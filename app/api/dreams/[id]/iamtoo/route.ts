import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 「我也是」（v2 §3.1）。梦主只能看到聚合数字。
// resonances_iamtoo.user_id 永不出现在任何响应中。

async function countFor(dreamId: string) {
  const db = supabaseAdmin();
  const { count, error } = await db
    .from("resonances_iamtoo")
    .select("dream_id", { count: "exact", head: true })
    .eq("dream_id", dreamId);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    return NextResponse.json({ count: await countFor(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST body: { userId }  — 匿名设备 ID，仅用于防重复
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
    // 不可撤销：重复点击直接忽略
    const { error } = await db
      .from("resonances_iamtoo")
      .upsert(
        { dream_id: id, user_id: body.userId },
        { onConflict: "dream_id,user_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return NextResponse.json({ count: await countFor(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
