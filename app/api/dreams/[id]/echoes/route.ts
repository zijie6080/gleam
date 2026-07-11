import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 第三级回响：一句话（v2 §3.3）。
// 列表不返回数量统计口径之外的任何身份信息；前端默认折叠、不显示数量。

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("echoes")
      .select("id, content, is_touched, created_at")
      .eq("dream_id", id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return NextResponse.json({ echoes: data });
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
