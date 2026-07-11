import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 会话读写。仅参与者可访问；到期即关闭并抹除消息（不留痕）。
// 任何响应不含对方 user_id。

type Conv = {
  id: string;
  user_a: string;
  user_b: string;
  opened_at: string | null;
  expires_at: string | null;
};

async function loadConv(id: string, userId: string) {
  const db = supabaseAdmin();
  const { data: conv } = await db
    .from("conversations")
    .select("id, user_a, user_b, opened_at, expires_at")
    .eq("id", id)
    .maybeSingle();
  if (!conv) return { error: "not found", status: 404 as const };
  if (conv.user_a !== userId && conv.user_b !== userId) {
    return { error: "not found", status: 404 as const }; // 不暴露存在性
  }
  const expired =
    conv.expires_at !== null && new Date(conv.expires_at) < new Date();
  if (expired) {
    // 不留痕：到期即物理删除消息
    await db.from("conversation_messages").delete().eq("conversation_id", id);
  }
  return { conv: conv as Conv, expired, db };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = req.nextUrl.searchParams.get("userId") ?? "";
  const res = await loadConv(id, userId);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  const { conv, expired, db } = res;

  if (expired) {
    return NextResponse.json({ status: "closed", messages: [] });
  }
  if (!conv.opened_at) {
    return NextResponse.json({ status: "waiting", messages: [] });
  }

  const side = conv.user_a === userId ? "a" : "b";
  const { data: messages } = await db
    .from("conversation_messages")
    .select("id, sender, content, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    status: "open",
    expiresAt: conv.expires_at,
    // 只标注是否本人发的，不带任何身份
    messages: (messages ?? []).map((m) => ({
      id: m.id,
      content: m.content,
      own: m.sender === side,
      created_at: m.created_at,
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  const content =
    typeof body.content === "string" ? body.content.trim().slice(0, 500) : "";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (!moderate(content).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  const res = await loadConv(id, userId);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: res.status });
  }
  const { conv, expired, db } = res;
  if (expired || !conv.opened_at) {
    return NextResponse.json({ error: "conversation closed" }, { status: 409 });
  }

  const side = conv.user_a === userId ? "a" : "b";
  const { error } = await db.from("conversation_messages").insert({
    conversation_id: id,
    sender: side,
    content,
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true }, { status: 201 });
}
