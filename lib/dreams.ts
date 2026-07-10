import { supabaseAdmin } from "@/lib/supabase";
import { extractMotifs, type ExtractedMotif } from "@/lib/deepseek";
import { embed } from "@/lib/embedding";

export type CreateDreamInput = {
  text: string;
  userId?: string;
  emotion?: string;
  lucidity?: number;
  isRecurring?: boolean;
};

export type SimilarDream = {
  dream_id: string;
  user_id: string | null;
  raw_text: string;
  similarity: number;
};

// 完整入库管线：存原文 → DeepSeek 提取意象 → embedding 写入 pgvector。
// 意象提取或 embedding 失败不阻塞入库，梦本身先保住（可后补处理）。
export async function createDream(input: CreateDreamInput) {
  const db = supabaseAdmin();

  const { data: dream, error } = await db
    .from("dreams")
    .insert({
      user_id: input.userId ?? null,
      raw_text: input.text,
      emotion: input.emotion ?? null,
      lucidity: input.lucidity ?? null,
      is_recurring: input.isRecurring ?? false,
    })
    .select()
    .single();
  if (error) throw new Error(`insert dream failed: ${error.message}`);

  const warnings: string[] = [];
  let motifs: ExtractedMotif[] = [];

  try {
    motifs = await extractMotifs(input.text);
    for (const m of motifs) {
      const { data: motif, error: motifErr } = await db
        .from("motifs")
        .upsert(
          { name: m.name, category: m.category },
          { onConflict: "name", ignoreDuplicates: false },
        )
        .select()
        .single();
      if (motifErr) throw new Error(motifErr.message);
      const { error: linkErr } = await db.from("dream_motifs").upsert({
        dream_id: dream.id,
        motif_id: motif.id,
        weight: m.weight,
      });
      if (linkErr) throw new Error(linkErr.message);
    }
  } catch (e) {
    warnings.push(`motif extraction failed: ${(e as Error).message}`);
  }

  try {
    const vector = await embed(input.text);
    const { error: embErr } = await db
      .from("dreams")
      .update({ embedding: JSON.stringify(vector) })
      .eq("id", dream.id);
    if (embErr) throw new Error(embErr.message);
  } catch (e) {
    warnings.push(`embedding failed: ${(e as Error).message}`);
  }

  return { dream, motifs, warnings };
}

// 相似梦查询：对给定梦调用库内 match_dreams 函数
export async function findSimilarDreams(
  dreamId: string,
  opts: { count?: number; minSimilarity?: number; excludeOwner?: boolean } = {},
): Promise<SimilarDream[]> {
  const db = supabaseAdmin();

  const { data: dream, error } = await db
    .from("dreams")
    .select("user_id, embedding")
    .eq("id", dreamId)
    .single();
  if (error) throw new Error(`dream not found: ${error.message}`);
  if (!dream.embedding) throw new Error("dream has no embedding yet");

  const { data, error: rpcErr } = await db.rpc("match_dreams", {
    query_embedding: dream.embedding,
    match_count: (opts.count ?? 10) + 1, // 结果里会包含自己，多取一个
    exclude_user: opts.excludeOwner ? dream.user_id : null,
    min_similarity: opts.minSimilarity ?? 0.5,
  });
  if (rpcErr) throw new Error(`match_dreams failed: ${rpcErr.message}`);

  return (data as SimilarDream[])
    .filter((d) => d.dream_id !== dreamId)
    .slice(0, opts.count ?? 10);
}
