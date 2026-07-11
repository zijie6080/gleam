import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { usernameToEmail, USERNAME_RE } from "@/lib/account";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 用户名+密码注册。服务端用 admin 建号（跳过邮箱确认）。
// 一台设备只能注册一个账号：注册时登记 deviceId，重复注册被拒。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const deviceId = typeof body.deviceId === "string" ? body.deviceId : "";

  if (!USERNAME_RE.test(username)) {
    return NextResponse.json(
      { error: "用户名需为 3–16 位字母、数字或下划线" },
      { status: 400 },
    );
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少 6 位" }, { status: 400 });
  }
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId is required" }, { status: 400 });
  }
  if (!moderate(username).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  try {
    const db = supabaseAdmin();

    // 一台设备一个账号
    const { data: existing } = await db
      .from("device_registrations")
      .select("device_id")
      .eq("device_id", deviceId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json(
        { error: "这台设备已经注册过账号了，直接登录就好。" },
        { status: 409 },
      );
    }

    const email = usernameToEmail(username);
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 合成邮箱不收信，直接确认
      user_metadata: { username },
    });
    if (error) {
      const msg = error.message.includes("already")
        ? "这个用户名已经有人用了"
        : error.message;
      return NextResponse.json({ error: msg }, { status: 409 });
    }

    await db.from("device_registrations").insert({
      device_id: deviceId,
      user_id: created.user.id,
    });
    // 用户名同时作为初始昵称
    await db.from("profiles").upsert(
      { id: created.user.id, nickname: username },
      { onConflict: "id" },
    );

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
