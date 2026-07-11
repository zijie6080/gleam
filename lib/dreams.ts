import { supabaseAdmin } from "@/lib/supabase";
import { extractMotifs, type ExtractedMotif } from "@/lib/deepseek";
import { embed } from "@/lib/embedding";
import { detectCrisis, isNightMode } from "@/lib/night";
import { MATCH_THRESHOLD } from "@/lib/match";

export type CreateDreamInput = {
  text: string;
  userId?: string;
  emotionScore?: number; // -1 惊惧 ~ 1 平静
  lucidity?: number;
  isRecurring?: boolean;
  localHour?: number; // 客户端本地小时，用于深夜模式判定
};

export type SimilarDream = {
  dream_id: string;
  user_id: string | null;
  raw_text: string;
  similarity: number;
};

// 完整入库管线：存原文 → DeepSeek 提取意象 → embedding 写入 pgvector。
// 深夜模式：跳过意象提取（不解读），embedding 仍写（内部匹配用，不外显）。
// 危机内容：产品让路——只存原文，什么都不做，返回 crisis 标记。
export async function createDream(input: CreateDreamInput) {
  const db = supabaseAdmin();

  const crisis = detectCrisis(input.text);
  const nightMode = !crisis && isNightMode(input.localHour, input.emotionScore);

  const { data: dream, error } = await db
    .from("dreams")
    .insert({
      user_id: input.userId ?? null,
      raw_text: input.text,
      emotion_score: input.emotionScore ?? null,
      lucidity: input.lucidity ?? null,
      is_recurring: input.isRecurring ?? false,
      is_night_mode: nightMode || crisis,
    })
    .select("id, raw_text, lucidity, emotion_score, is_night_mode, created_at")
    .single();
  if (error) throw new Error(`insert dream failed: ${error.message}`);

  const warnings: string[] = [];
  let motifs: ExtractedMotif[] = [];

  // 极短输入（如"梦见水"）只存文本，不跑 AI 管线（v2 §8）
  const tooShort = input.text.trim().length < 6;

  if (!crisis && !nightMode && !tooShort) {
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
        // 全站词频，用于意象考古排除头部意象
        await db.rpc("increment_motif_count", { motif: motif.id });
      }
    } catch (e) {
      warnings.push(`motif extraction failed: ${(e as Error).message}`);
    }
  }

  if (!crisis) {
    try {
      const vector = await embed(input.text);
      const { error: embErr } = await db
        .from("dreams")
        .update({ embedding: JSON.stringify(vector) })
        .eq("id", dream.id);
      if (embErr) throw new Error(embErr.message);

      // 心跳通知：这个新梦命中了谁，就告诉谁（每人一条未读，不叠加）
      if (input.userId) {
        const { data: matches } = await db.rpc("recent_similar_dreams", {
          query_embedding: JSON.stringify(vector),
          self_dream: dream.id,
          self_user: input.userId,
          min_similarity: MATCH_THRESHOLD,
        });
        const users = [
          ...new Set(
            ((matches ?? []) as { user_id: string }[]).map((m) => m.user_id),
          ),
        ];
        for (const uid of users) {
          const { data: existing } = await db
            .from("notifications")
            .select("id")
            .eq("user_id", uid)
            .eq("type", "resonance")
            .eq("read", false)
            .limit(1)
            .maybeSingle();
          if (!existing) {
            await db.from("notifications").insert({
              user_id: uid,
              type: "resonance",
              payload: {},
            });
          }
        }
      }
    } catch (e) {
      warnings.push(`embedding failed: ${(e as Error).message}`);
    }
  }

  return { dream, motifs, warnings, nightMode, crisis };
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
