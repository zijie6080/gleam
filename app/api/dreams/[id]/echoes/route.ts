import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 广场评论。评论者显示昵称+头像（有温度），但梦的发布者仍匿名。
// 响应中不含评论者的 user_id 本身，只带展示用的昵称/头像。

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("echoes")
      .select("id, content, user_id, is_ai, created_at")
      .eq("dream_id", id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);

    // 批量取评论者资料
    const userIds = [
      ...new Set((data ?? []).map((e) => e.user_id).filter(Boolean)),
    ] as string[];
    const profileMap = new Map<string, { nickname: string; avatarUrl: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, nickname, avatar_url")
        .in("id", userIds);
      for (const p of profiles ?? []) {
        profileMap.set(p.id, {
          nickname: p.nickname ?? "梦游者",
          avatarUrl: p.avatar_url ?? null,
        });
      }
    }

    const echoes = (data ?? []).map((e) => {
      const prof = e.user_id ? profileMap.get(e.user_id) : null;
      return {
        id: e.id,
        content: e.content,
        created_at: e.created_at,
        isAi: Boolean(e.is_ai),
        nickname: e.is_ai ? "AI 意象拆解" : (prof?.nickname ?? "梦游者"),
        avatarUrl: prof?.avatarUrl ?? null,
      };
    });
    return NextResponse.json({ echoes });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST body: { userId?, content }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    return NextResponse.json({ error: "content is required" }, { status: 400 });
  }
  if (!moderate(content).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("echoes")
      .insert({
        dream_id: id,
        user_id: typeof body.userId === "string" ? body.userId : null,
        content: content.slice(0, 200),
      })
      .select("id, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ echo: data }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
