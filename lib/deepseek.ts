// DeepSeek 意象提取：梦境文本 → 意象 JSON 数组

export type ExtractedMotif = {
  name: string; // 意象名，如 "坠落" "水" "月"
  category: string; // 类别：场景 / 动作 / 物象 / 人物 / 情绪
  weight: number; // 0–1，该意象在梦中的核心程度
};

const SYSTEM_PROMPT = `你是一个梦境意象提取器。从用户的梦境记录中提取核心意象。

规则：
- 每个意象是一个 1-3 字的中文语义单元（如 坠落、水、月、楼梯、追逐）
- category 从以下选择：场景、动作、物象、人物、情绪
- weight 为 0 到 1 的小数，表示该意象在这个梦中的核心程度
- 提取 2 到 6 个，宁缺毋滥
- 禁止诊断性、预言性表述；只做客观的语义提取
- 只输出 JSON，格式：{"motifs": [{"name": "...", "category": "...", "weight": 0.9}]}`;

export async function extractMotifs(
  dreamText: string,
): Promise<ExtractedMotif[]> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY env var");

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: dreamText },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    throw new Error(`DeepSeek API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  const motifs: unknown = parsed.motifs;
  if (!Array.isArray(motifs)) {
    throw new Error("DeepSeek returned unexpected shape: no motifs array");
  }

  return motifs
    .filter(
      (m): m is ExtractedMotif =>
        typeof m?.name === "string" && m.name.length > 0,
    )
    .map((m) => ({
      name: m.name.trim().slice(0, 8),
      category: typeof m.category === "string" ? m.category : "物象",
      weight:
        typeof m.weight === "number" ? Math.min(Math.max(m.weight, 0), 1) : 0.5,
    }))
    .slice(0, 6);
}
