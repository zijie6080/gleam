import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 心跳通知：GET 取未读，POST 标记已读
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data, error } = await db
    .from("notifications")
    .select("id, type, payload, created_at")
    .eq("user_id", userId)
    .eq("read", false)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ notifications: data ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (!userId || ids.length === 0) {
    return NextResponse.json(
      { error: "userId and ids are required" },
      { status: 400 },
    );
  }
  const db = supabaseAdmin();
  const { error } = await db
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .in("id", ids);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
