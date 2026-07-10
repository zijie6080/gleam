import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 第二级回响：一个词（v2 §3.2）。
// 梦主收到的是聚合的情绪云图，不是一条条评论。user_id 永不返回。

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("echo_words")
      .select("word")
      .eq("dream_id", id);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    for (const { word } of data) {
      counts.set(word, (counts.get(word) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([word, count]) => ({ word, count }));

    return NextResponse.json({ total: data.length, top });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

// POST body: { userId, word } — word 限 1–4 个字
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const word = typeof body.word === "string" ? body.word.trim() : "";
  if (typeof body.userId !== "string" || !word) {
    return NextResponse.json(
      { error: "userId and word are required" },
      { status: 400 },
    );
  }
  if (word.length < 1 || word.length > 4) {
    return NextResponse.json(
      { error: "word must be 1-4 characters" },
      { status: 400 },
    );
  }
  try {
    const db = supabaseAdmin();
    const { error } = await db
      .from("echo_words")
      .insert({ dream_id: id, user_id: body.userId, word });
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
