import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { data: conversation } = await auth.db
    .from("conversations")
    .select("id, user_a, user_b")
    .eq("id", id)
    .maybeSingle();
  if (
    !conversation ||
    (conversation.user_a !== auth.user.id &&
      conversation.user_b !== auth.user.id)
  ) {
    return NextResponse.json({ error: "没有找到这个对话" }, { status: 404 });
  }

  await auth.db
    .from("conversation_messages")
    .delete()
    .eq("conversation_id", id);
  await auth.db
    .from("conversations")
    .update({ expires_at: new Date().toISOString() })
    .eq("id", id);
  return NextResponse.json({ ok: true });
}

