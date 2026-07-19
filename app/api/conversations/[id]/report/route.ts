import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 举报对话：快照最近 20 条消息留证（供人工复核），然后销毁并关闭。
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

    const { data: messages } = await db
      .from("conversation_messages")
      .select("sender, content, created_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: false })
      .limit(20);

    await db.from("reports").upsert(
      {
        target_type: "conversation",
        target_id: id,
        reporter_id: userId,
        snapshot: { messages: messages ?? [] },
      },
      { onConflict: "target_type,target_id,reporter_id" },
    );

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
