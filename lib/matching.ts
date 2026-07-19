import { supabaseAdmin } from "@/lib/supabase";

// 语义匹配 v2（docs/semantic-matching.md）
// score = 0.7 × 余弦 + 0.3 × 意象加权 Jaccard，情绪相反打 8 折。
// 强匹配 ≥ 0.72（同梦，可开对话），弱匹配 0.58–0.72（相似意象，安静展示）。
// 时间窗降级：24h（今晚）→ 30 天（这个月）→ 全量（曾经）。

export const STRONG_THRESHOLD = 0.72;
export const WEAK_THRESHOLD = 0.58;

export type MatchTier = {
  window: "today" | "month" | "ever";
  strong: ScoredMatch[];
  weak: ScoredMatch[];
  motif: string | null; // 本梦主意象，用于文案
};

export type ScoredMatch = {
  dream_id: string;
  user_id: string | null;
  score: number;
};

type MotifWeights = Map<string, number>;

function weightedJaccard(a: MotifWeights, b: MotifWeights): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  let union = 0;
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const k of keys) {
    const wa = a.get(k) ?? 0;
    const wb = b.get(k) ?? 0;
    inter += Math.min(wa, wb);
    union += Math.max(wa, wb);
  }
  return union === 0 ? 0 : inter / union;
}

async function motifWeightsFor(
  dreamIds: string[],
): Promise<Map<string, MotifWeights>> {
  const db = supabaseAdmin();
  const result = new Map<string, MotifWeights>();
  if (dreamIds.length === 0) return result;
  const { data } = await db
    .from("dream_motifs")
    .select("dream_id, weight, motifs(name)")
    .in("dream_id", dreamIds);
  for (const row of data ?? []) {
    const name = (row.motifs as unknown as { name: string })?.name;
    if (!name) continue;
    const m = result.get(row.dream_id) ?? new Map();
    m.set(name, row.weight);
    result.set(row.dream_id, m);
  }
  return result;
}

// 对一个梦跑完整匹配：候选（pgvector 余弦 top-50）→ 混合打分 → 分层。
// 逐级放宽时间窗，直到强或弱任一非空。
export async function matchDream(dream: {
  id: string;
  user_id: string | null;
  embedding: unknown;
  emotion_score?: number | null;
}): Promise<MatchTier> {
  const db = supabaseAdmin();

  const windows: { window: MatchTier["window"]; since: string }[] = [
    { window: "today", since: new Date(Date.now() - 24 * 3600_000).toISOString() },
    { window: "month", since: new Date(Date.now() - 30 * 24 * 3600_000).toISOString() },
    { window: "ever", since: "1970-01-01T00:00:00Z" },
  ];

  const [myMotifsMap, { data: motifRow }] = await Promise.all([
    motifWeightsFor([dream.id]),
    db
      .from("dream_motifs")
      .select("weight, motifs(name)")
      .eq("dream_id", dream.id)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  const myMotifs = myMotifsMap.get(dream.id) ?? new Map();
  const m = motifRow?.motifs as unknown as { name: string } | null;
  const topMotif = m?.name ?? null;

  for (const { window, since } of windows) {
    const { data: cands } = await db.rpc("match_candidates", {
      query_embedding: dream.embedding,
      self_dream: dream.id,
      self_user: dream.user_id,
      since,
      candidate_count: 50,
    });
    const list = (cands ?? []) as {
      dream_id: string;
      user_id: string | null;
      cosine: number;
    }[];
    if (list.length === 0) continue;

    const candMotifs = await motifWeightsFor(list.map((c) => c.dream_id));

    // 情绪否决需要候选梦的情绪值
    const { data: emotions } = await db
      .from("dreams")
      .select("id, emotion_score")
      .in("id", list.map((c) => c.dream_id));
    const emotionMap = new Map(
      (emotions ?? []).map((e) => [e.id, e.emotion_score as number | null]),
    );

    const scored: ScoredMatch[] = list.map((c) => {
      let score =
        0.7 * c.cosine +
        0.3 * weightedJaccard(myMotifs, candMotifs.get(c.dream_id) ?? new Map());
      // 情绪否决：一个平静一个惊惧 → 8 折
      const mine = dream.emotion_score ?? null;
      const theirs = emotionMap.get(c.dream_id) ?? null;
      if (mine !== null && theirs !== null) {
        if ((mine > 0.5 && theirs < -0.5) || (mine < -0.5 && theirs > 0.5)) {
          score *= 0.8;
        }
      }
      return { dream_id: c.dream_id, user_id: c.user_id, score };
    });

    const strong = scored
      .filter((s) => s.score >= STRONG_THRESHOLD)
      .sort((a, b) => b.score - a.score);
    const weak = scored
      .filter((s) => s.score >= WEAK_THRESHOLD && s.score < STRONG_THRESHOLD)
      .sort((a, b) => b.score - a.score);

    if (strong.length > 0 || weak.length > 0) {
      return { window, strong, weak, motif: topMotif };
    }
  }

  return { window: "ever", strong: [], weak: [], motif: topMotif };
}

// 对某用户最近一个可匹配的梦跑匹配（summary / open 共用）
export async function matchLatestFor(userId: string): Promise<
  (MatchTier & { dreamId: string }) | null
> {
  const db = supabaseAdmin();
  const { data: latest } = await db
    .from("dreams")
    .select("id, user_id, embedding, emotion_score")
    .eq("user_id", userId)
    .not("embedding", "is", null)
    .eq("is_night_mode", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return null;
  const tier = await matchDream(latest);
  return { ...tier, dreamId: latest.id };
}
