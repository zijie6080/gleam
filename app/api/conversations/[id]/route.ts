import { NextRequest, NextResponse } from "next/server";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";
import { requireUser } from "@/lib/serverAuth";

async function loadConversation(req: NextRequest, id: string) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;
  const { data: conversation } = await auth.db
    .from("conversations")
    .select("id, user_a, user_b, opened_at, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (
    !conversation ||
    (conversation.user_a !== auth.user.id &&
      conversation.user_b !== auth.user.id)
  ) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "没有找到这个对话" }, { status: 404 }),
    };
  }
  const expired =
    conversation.expires_at !== null &&
    new Date(conversation.expires_at) < new Date();
  if (expired) {
    await auth.db
      .from("conversation_messages")
      .delete()
      .eq("conversation_id", id);
  }
  return { ...auth, conversation, expired };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await loadConversation(req, id);
  if (!auth.ok) return auth.response;
  if (auth.expired) {
    return NextResponse.json({ status: "closed", messages: [] });
  }
  if (!auth.conversation.opened_at) {
    return NextResponse.json({ status: "waiting", messages: [] });
  }
  const side = auth.conversation.user_a === auth.user.id ? "a" : "b";
  const { data: messages } = await auth.db
    .from("conversation_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  return NextResponse.json({
    status: "open",
    expiresAt: auth.conversation.expires_at,
    messages: (messages ?? []).map((message) => ({
      id: message.id,
      content: message.content,
      own: message.sender === side,
      created_at: message.created_at,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const content =
    typeof body.content === "string" ? body.content.trim().slice(0, 500) : "";
  if (!content) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }
  if (!moderate(content).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  const auth = await loadConversation(req, id);
  if (!auth.ok) return auth.response;
  if (auth.expired || !auth.conversation.opened_at) {
    return NextResponse.json({ error: "对话已经关闭" }, { status: 409 });
  }
  const side = auth.conversation.user_a === auth.user.id ? "a" : "b";
  const { error } = await auth.db.from("conversation_messages").insert({
    conversation_id: id,
    sender: side,
    content,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}

