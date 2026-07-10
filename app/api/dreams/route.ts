import { NextRequest, NextResponse } from "next/server";
import { createDream } from "@/lib/dreams";

// POST /api/dreams — 文本入库 + 意象提取 + embedding
// body: { text, userId?, emotionScore?, lucidity?, isRecurring?, localHour? }
export async function POST(req: NextRequest) {
  let body: {
    text?: unknown;
    userId?: string;
    emotionScore?: number;
    lucidity?: number;
    isRecurring?: boolean;
    localHour?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (typeof body.text !== "string" || body.text.trim().length === 0) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  if (
    body.lucidity !== undefined &&
    (!Number.isInteger(body.lucidity) || body.lucidity < 1 || body.lucidity > 5)
  ) {
    return NextResponse.json(
      { error: "lucidity must be an integer 1-5" },
      { status: 400 },
    );
  }

  try {
    const result = await createDream({
      text: body.text.trim(),
      userId: body.userId,
      emotionScore: body.emotionScore,
      lucidity: body.lucidity,
      isRecurring: body.isRecurring,
      localHour: body.localHour,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
