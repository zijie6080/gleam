import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 彻底删除（v2 §7.2）：该匿名 ID 名下的梦（级联删意象关联/回响/故事/会话）
// 以及该 ID 发出的「我也是」和词回响
export async function DELETE(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  try {
    const db = supabaseAdmin();
    await db.from("resonances_iamtoo").delete().eq("user_id", userId);
    await db.from("echo_words").delete().eq("user_id", userId);
    await db.from("echoes").delete().eq("user_id", userId);
    const { error } = await db.from("dreams").delete().eq("user_id", userId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
