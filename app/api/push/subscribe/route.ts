import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const subscription = body.subscription;
  if (!subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: "订阅内容无效" }, { status: 400 });
  }
  const { error } = await auth.db.from("push_subscriptions").upsert({
    endpoint: subscription.endpoint,
    user_id: auth.user.id,
    keys: subscription.keys,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
  if (!endpoint) {
    return NextResponse.json({ error: "缺少订阅地址" }, { status: 400 });
  }
  await auth.db
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", auth.user.id);
  return NextResponse.json({ ok: true });
}
