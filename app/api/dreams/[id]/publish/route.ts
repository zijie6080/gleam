import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";
import { llmBudgetOk } from "@/lib/budget";

const INTERPRET_PROMPT = `你是拾梦的 AI 意象拆解者。对一个梦境给出一段温和的文化视角解读（120–200 字）。

必须遵守：
- 从荣格/民俗/文学等文化视角谈意象的常见象征，语气安静克制
- 绝对禁止诊断性、预言性表述（"你可能患有""这预示着"等一律不允许）
- 以第二人称"你"称呼梦主，像一封短信
- 直接输出正文，不要标题不要引号`;

// 回响不落空：投放时自动生成一条 AI 意象拆解评论（失败不阻塞投放）
async function generateBaseline(dreamId: string, text: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return;
  const db = supabaseAdmin();
  // 已有 AI 解读就不重复生成
  const { data: existing } = await db
    .from("echoes")
    .select("id")
    .eq("dream_id", dreamId)
    .eq("is_ai", true)
    .limit(1)
    .maybeSingle();
  if (existing) return;
  // 每日成本熔断：额度用完就不生成兜底解读（投放本身不受影响）
  if (!(await llmBudgetOk())) return;

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: INTERPRET_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });
  if (!res.ok) return;
  const data = await res.json();
  const content: string = data.choices[0].message.content.trim();
  if (content) {
    await db
      .from("echoes")
      .insert({ dream_id: dreamId, user_id: null, content, is_ai: true });
  }
}

// 「投放回响」：显式发布到广场（默认私有是底线，发布必须显式操作）
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const db = supabaseAdmin();
    const { data: dream, error } = await db
      .from("dreams")
      .select("user_id, is_night_mode, raw_text")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }
    // 只有梦主能投放
    if (dream.user_id && dream.user_id !== body.userId) {
      return NextResponse.json({ error: "not your dream" }, { status: 403 });
    }
    // 深夜模式的梦不推送到广场
    if (dream.is_night_mode) {
      return NextResponse.json({ error: "night mode" }, { status: 409 });
    }
    // 公开前过一道机审
    if (!moderate(dream.raw_text).ok) {
      return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
    }

    const { error: uErr } = await db
      .from("dreams")
      .update({ visibility: "public" })
      .eq("id", id);
    if (uErr) throw new Error(uErr.message);

    // 回响不落空：投放即有 AI 意象拆解兜底
    await generateBaseline(id, dream.raw_text).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
