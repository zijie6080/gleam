import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 匿名设备 ID → 登录账号的数据迁移。
// 目标身份从 Auth token 里验出，不信任客户端声明，防止把别人的数据搬走。
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const from = typeof body.from === "string" ? body.from : "";
  const token = typeof body.token === "string" ? body.token : "";
  if (!from || !token) {
    return NextResponse.json(
      { error: "from and token are required" },
      { status: 400 },
    );
  }

  try {
    const db = supabaseAdmin();
    const { data: userData, error: authErr } = await db.auth.getUser(token);
    if (authErr || !userData.user) {
      return NextResponse.json({ error: "invalid token" }, { status: 401 });
    }
    const to = userData.user.id;
    if (from === to) return NextResponse.json({ ok: true, moved: 0 });

    // 仅当 from 是"无主"的匿名 ID（不属于任何 Auth 用户）时才允许迁移
    const { data: owner } = await db.auth.admin
      .getUserById(from)
      .catch(() => ({ data: { user: null } }));
    if (owner?.user) {
      return NextResponse.json({ error: "source is an account" }, { status: 403 });
    }

    for (const table of [
      "dreams",
      "resonances_iamtoo",
      "echo_words",
      "echoes",
    ]) {
      await db.from(table).update({ user_id: to }).eq("user_id", from);
    }
    await db.from("conversations").update({ user_a: to }).eq("user_a", from);
    await db.from("conversations").update({ user_b: to }).eq("user_b", from);
    await db.from("notifications").update({ user_id: to }).eq("user_id", from);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
