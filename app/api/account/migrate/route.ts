import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

// 把当前设备的匿名 Auth 用户数据迁到刚登录的正式账号。
// 同时校验来源和目标两份 token，不再相信浏览器直接声明的 userId。
export async function POST(req: NextRequest) {
  const target = await requireUser(req);
  if (!target.ok) return target.response;

  const body = await req.json().catch(() => ({}));
  const sourceToken =
    typeof body.sourceToken === "string" ? body.sourceToken : "";
  if (!sourceToken) {
    return NextResponse.json({ error: "缺少原设备身份凭证" }, { status: 400 });
  }

  try {
    const { db, user: targetUser } = target;
    const { data: sourceData, error } = await db.auth.getUser(sourceToken);
    if (error || !sourceData.user) {
      return NextResponse.json({ error: "原设备身份无效" }, { status: 401 });
    }

    const sourceUser = sourceData.user;
    if (!sourceUser.is_anonymous) {
      return NextResponse.json(
        { error: "只能迁移匿名账号的数据" },
        { status: 403 },
      );
    }
    if (sourceUser.id === targetUser.id) {
      return NextResponse.json({ ok: true, moved: false });
    }

    for (const table of [
      "dreams",
      "resonances_iamtoo",
      "echo_words",
      "echoes",
      "notifications",
      "push_subscriptions",
    ]) {
      await db
        .from(table)
        .update({ user_id: targetUser.id })
        .eq("user_id", sourceUser.id);
    }
    await db
      .from("conversations")
      .update({ user_a: targetUser.id })
      .eq("user_a", sourceUser.id);
    await db
      .from("conversations")
      .update({ user_b: targetUser.id })
      .eq("user_b", sourceUser.id);

    await db.auth.admin.deleteUser(sourceUser.id);
    return NextResponse.json({ ok: true, moved: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
