import { NextRequest, NextResponse } from "next/server";
import { llmBudgetOk, BUDGET_MESSAGE } from "@/lib/budget";
import { requireDreamOwner } from "@/lib/dreamAuth";

const STORY_PROMPT = `你是一个梦境书写者。把用户碎片化的梦境记录补全为一篇完整的短篇（800–1200 字）。

必须遵守：
- 保留梦的逻辑跳跃感，不强行合理化
- 用第一人称，安静克制的散文诗语气
- 禁止诊断性、预言性表述；不解释，只叙述
- 直接输出正文，不要标题`;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDreamOwner(req, id);
  if (!auth.ok) return auth.response;

  const { data } = await auth.db
    .from("stories")
    .select("id, content, created_at")
    .eq("dream_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ story: data ?? null });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDreamOwner(req, id);
  if (!auth.ok) return auth.response;
  if (auth.dream.is_night_mode) {
    return NextResponse.json({ error: "深夜记录不能生成故事" }, { status: 409 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "故事功能未配置" }, { status: 503 });
  }
  if (!(await llmBudgetOk())) {
    return NextResponse.json({ error: BUDGET_MESSAGE }, { status: 429 });
  }

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        messages: [
          { role: "system", content: STORY_PROMPT },
          { role: "user", content: auth.dream.raw_text },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });
    if (!response.ok) {
      throw new Error(`DeepSeek ${response.status}`);
    }
    const result = await response.json();
    const content: string = result.choices[0].message.content.trim();
    const { data: story, error } = await auth.db
      .from("stories")
      .insert({ dream_id: id, content })
      .select("id, content, created_at")
      .single();
    if (error) throw new Error(error.message);
    return NextResponse.json({ story }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

