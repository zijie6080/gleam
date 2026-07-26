import { NextRequest, NextResponse } from "next/server";
import { usernameToEmail, USERNAME_RE } from "@/lib/account";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";
import { requireUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  if (!auth.user.is_anonymous) {
    return NextResponse.json({ error: "当前账号已经注册" }, { status: 409 });
  }

  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "用户名需为 3–16 位字母、数字或下划线" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (!moderate(username).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  try {
    const { db, user: sourceUser } = auth;
    const { data: existing } = await db
      .from("device_registrations")
      .select("device_id")
      .eq("device_id", sourceUser.id)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "这台设备已经注册过账号了，直接登录就好。" },
        { status: 409 },
      );
    }

    const { data: created, error } = await db.auth.admin.createUser({
      email: usernameToEmail(username),
      password,
      email_confirm: true,
      user_metadata: { username },
    });
    if (error) {
      return NextResponse.json(
        {
          error: error.message.includes("already")
            ? "这个用户名已经有人用了"
            : error.message,
        },
        { status: 409 },
      );
    }

    await db.from("device_registrations").insert({
      device_id: sourceUser.id,
      user_id: created.user.id,
    });
    await db.from("profiles").upsert(
      { id: created.user.id, nickname: username },
      { onConflict: "id" },
    );
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
