import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { extractMotifs } from "@/lib/deepseek";
import { embed } from "@/lib/embedding";

// 「再生成」：对已有梦重跑意象提取 + embedding（旧关联清掉重建）
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data: dream, error } = await db
      .from("dreams")
      .select("raw_text, is_night_mode")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }
    if (dream.is_night_mode) {
      return NextResponse.json({ error: "night mode" }, { status: 409 });
    }

    await db.from("dream_motifs").delete().eq("dream_id", id);

    const motifs = await extractMotifs(dream.raw_text);
    for (const m of motifs) {
      const { data: motif, error: mErr } = await db
        .from("motifs")
        .upsert(
          { name: m.name, category: m.category },
          { onConflict: "name", ignoreDuplicates: false },
        )
        .select()
        .single();
      if (mErr) throw new Error(mErr.message);
      await db.from("dream_motifs").upsert({
        dream_id: id,
        motif_id: motif.id,
        weight: m.weight,
      });
    }

    const vector = await embed(dream.raw_text);
    await db
      .from("dreams")
      .update({ embedding: JSON.stringify(vector) })
      .eq("id", id);

    return NextResponse.json({ motifs });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
