import { NextRequest, NextResponse } from "next/server";
import { createDream } from "@/lib/dreams";
import { requireUser } from "@/lib/serverAuth";

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body.text !== "string") {
    return NextResponse.json({ error: "梦境内容不能为空" }, { status: 400 });
  }
  const text = body.text.trim();
  if (!text || text.length > 5000) {
    return NextResponse.json(
      { error: text ? "梦境内容不能超过 5000 字" : "梦境内容不能为空" },
      { status: 400 },
    );
  }
  if (
    body.lucidity !== undefined &&
    (!Number.isInteger(body.lucidity) || body.lucidity < 1 || body.lucidity > 5)
  ) {
    return NextResponse.json(
      { error: "清醒度必须是 1 到 5" },
      { status: 400 },
    );
  }
  if (
    body.emotionScore !== undefined &&
    (typeof body.emotionScore !== "number" ||
      body.emotionScore < -1 ||
      body.emotionScore > 1)
  ) {
    return NextResponse.json(
      { error: "情绪值必须在 -1 到 1 之间" },
      { status: 400 },
    );
  }

  try {
    const result = await createDream({
      text,
      userId: auth.user.id,
      emotionScore: body.emotionScore,
      lucidity: body.lucidity,
      isRecurring: Boolean(body.isRecurring),
      localHour: body.localHour,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

