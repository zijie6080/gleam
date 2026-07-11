import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 「投放回响」：显式发布到广场（默认私有是底线，发布必须显式操作）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const db = supabaseAdmin();
    const { data: dream, error } = await db
      .from("dreams")
      .select("user_id, is_night_mode, raw_text")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }
    // 只有梦主能投放
    if (dream.user_id && dream.user_id !== body.userId) {
      return NextResponse.json({ error: "not your dream" }, { status: 403 });
    }
    // 深夜模式的梦不推送到广场
    if (dream.is_night_mode) {
      return NextResponse.json({ error: "night mode" }, { status: 409 });
    }
    // 公开前过一道机审
    if (!moderate(dream.raw_text).ok) {
      return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
    }

    const { error: uErr } = await db
      .from("dreams")
      .update({ visibility: "public" })
      .eq("id", id);
    if (uErr) throw new Error(uErr.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
