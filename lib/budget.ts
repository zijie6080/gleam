import { supabaseAdmin } from "@/lib/supabase";

// 每日 LLM 调用熔断（成本保险）。
// 每次 DeepSeek 调用前先扣一次额度；超限当天自动降级：
// 梦照常保存和向量化（embedding 免费），只是不跑意象提取/解读/故事。
// 限额用 env 调整，默认 500 次/天 ≈ 每天最多几块钱。
const DEFAULT_DAILY_LIMIT = 500;

export async function llmBudgetOk(): Promise<boolean> {
  try {
    const limit = Number(process.env.DAILY_LLM_LIMIT) || DEFAULT_DAILY_LIMIT;
    const db = supabaseAdmin();
    const { data, error } = await db.rpc("consume_llm_budget", {
      daily_limit: limit,
    });
    if (error) return true; // 计数失败不阻塞业务，宁可多花几分钱
    return Boolean(data);
  } catch {
    return true;
  }
}

export const BUDGET_MESSAGE = "今天的 AI 额度用完了，明天再来。梦已经好好存下了。";
