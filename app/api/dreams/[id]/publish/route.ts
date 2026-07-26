import { NextRequest, NextResponse } from "next/server";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";
import { llmBudgetOk } from "@/lib/budget";
import { requireDreamOwner } from "@/lib/dreamAuth";

const INTERPRET_PROMPT = `你是拾梦的 AI 意象拆解者。对一个梦境给出一段温和的文化视角解读（120–200 字）。
从荣格、民俗或文学等文化视角谈常见象征；禁止诊断和预言；直接输出正文。`;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await requireDreamOwner(req, id);
  if (!auth.ok) return auth.response;
  if (auth.dream.is_night_mode) {
    return NextResponse.json({ error: "深夜记录不能投放" }, { status: 409 });
  }
  if (!moderate(auth.dream.raw_text).ok) {
    return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
  }

  const { error } = await auth.db
    .from("dreams")
    .update({ visibility: "public" })
    .eq("id", id)
    .eq("user_id", auth.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (apiKey && (await llmBudgetOk())) {
    const { data: existing } = await auth.db
      .from("echoes")
      .select("id")
      .eq("dream_id", id)
      .eq("is_ai", true)
      .limit(1)
      .maybeSingle();
    if (!existing) {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
          messages: [
            { role: "system", content: INTERPRET_PROMPT },
            { role: "user", content: auth.dream.raw_text },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      }).catch(() => null);
      if (response?.ok) {
        const result = await response.json();
        const content: string = result.choices?.[0]?.message?.content?.trim() ?? "";
        if (content) {
          await auth.db.from("echoes").insert({
            dream_id: id,
            user_id: null,
            content,
            is_ai: true,
          });
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
