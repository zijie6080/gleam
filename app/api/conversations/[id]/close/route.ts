import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 单方即时关闭（反滥用一等公民）：任一参与者点击立即销毁消息，
// 不通知对方原因。匿名对话里用户唯一的自保手段是"随时离开且不留痕"。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";

  try {
    const db = supabaseAdmin();
    const { data: conv } = await db
      .from("conversations")
      .select("id, user_a, user_b")
      .eq("id", id)
      .maybeSingle();
    if (!conv || (conv.user_a !== userId && conv.user_b !== userId)) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db.from("conversation_messages").delete().eq("conversation_id", id);
    await db
      .from("conversations")
      .update({ expires_at: new Date().toISOString() })
      .eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
