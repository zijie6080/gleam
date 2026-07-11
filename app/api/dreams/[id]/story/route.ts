import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const STORY_PROMPT = `你是一个梦境书写者。把用户碎片化的梦境记录补全为一篇完整的短篇（600–1200 字）。

必须遵守：
- 保留梦的逻辑跳跃感，不强行合理化——这是质量关键
- 用第一人称，安静克制的散文诗语气
- 禁止诊断性、预言性表述；不解读，只叙述
- 直接输出正文，不要标题、不要说明`;

// 续写故事：DeepSeek 把碎片梦境补全为短篇。GET 取最新一篇，POST 生成新的。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const db = supabaseAdmin();
  const { data } = await db
    .from("stories")
    .select("id, content, created_at")
    .eq("dream_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return NextResponse.json({ story: data ?? null });
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

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
    // 深夜模式的梦不做任何生成
    if (dream.is_night_mode) {
      return NextResponse.json({ error: "night mode" }, { status: 409 });
    }

    const res = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
        messages: [
          { role: "system", content: STORY_PROMPT },
          { role: "user", content: dream.raw_text },
        ],
        temperature: 0.9,
        max_tokens: 2000,
      }),
    });
    if (!res.ok) {
      throw new Error(`DeepSeek ${res.status}: ${await res.text()}`);
    }
    const data = await res.json();
    const content: string = data.choices[0].message.content.trim();

    const { data: story, error: sErr } = await db
      .from("stories")
      .insert({ dream_id: id, content })
      .select("id, content, created_at")
      .single();
    if (sErr) throw new Error(sErr.message);

    return NextResponse.json({ story }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
