import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 举报公开的梦。2 个不同用户举报 → 自动下架（转回 private）待人工复核。
// 阈值从严：匿名社区的信任崩一次就没了。
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const userId = typeof body.userId === "string" ? body.userId : "";
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const { data: dream } = await db
      .from("dreams")
      .select("id, raw_text, visibility")
      .eq("id", id)
      .maybeSingle();
    if (!dream || dream.visibility !== "public") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }

    await db.from("reports").upsert(
      {
        target_type: "dream",
        target_id: id,
        reporter_id: userId,
        snapshot: { text: dream.raw_text.slice(0, 500) },
      },
      { onConflict: "target_type,target_id,reporter_id" },
    );

    const { count } = await db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("target_type", "dream")
      .eq("target_id", id);

    if ((count ?? 0) >= 2) {
      await db.from("dreams").update({ visibility: "private" }).eq("id", id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
