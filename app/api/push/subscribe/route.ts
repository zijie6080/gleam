import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 保存/删除 Web Push 订阅
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const sub = body.subscription;
  if (!userId || !sub?.endpoint || !sub?.keys) {
    return NextResponse.json(
      { error: "userId and subscription are required" },
      { status: 400 },
    );
  }
  const db = supabaseAdmin();
  const { error } = await db.from("push_subscriptions").upsert({
    endpoint: sub.endpoint,
    user_id: userId,
    keys: sub.keys,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "endpoint is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
