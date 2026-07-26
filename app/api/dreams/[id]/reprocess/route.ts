import { NextRequest, NextResponse } from "next/server";
import { extractMotifs } from "@/lib/deepseek";
import { embed } from "@/lib/embedding";
import { llmBudgetOk, BUDGET_MESSAGE } from "@/lib/budget";
import { requireDreamOwner } from "@/lib/dreamAuth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDreamOwner(req, id);
  if (!auth.ok) return auth.response;
  if (auth.dream.is_night_mode) {
    return NextResponse.json({ error: "深夜记录不能生成分析" }, { status: 409 });
  }
  if (!(await llmBudgetOk())) {
    return NextResponse.json({ error: BUDGET_MESSAGE }, { status: 429 });
  }

  try {
    await auth.db.from("dream_motifs").delete().eq("dream_id", id);
    const motifs = await extractMotifs(auth.dream.raw_text);
    for (const item of motifs) {
      const { data: motif, error } = await auth.db
        .from("motifs")
        .upsert(
          { name: item.name, category: item.category },
          { onConflict: "name", ignoreDuplicates: false },
        )
        .select()
        .single();
      if (error) throw new Error(error.message);
      await auth.db.from("dream_motifs").upsert({
        dream_id: id,
        motif_id: motif.id,
        weight: item.weight,
      });
    }
    const vector = await embed(auth.dream.raw_text);
    await auth.db
      .from("dreams")
      .update({ embedding: JSON.stringify(vector) })
      .eq("id", id)
      .eq("user_id", auth.user.id);
    return NextResponse.json({ motifs });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

