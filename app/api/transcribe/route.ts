import { NextRequest, NextResponse } from "next/server";

// 语音转写：SiliconFlow SenseVoice（OpenAI 兼容 /audio/transcriptions）
// 复用 EMBEDDING_API_KEY（同一平台）。失败时前端降级为文本输入。
export async function POST(req: NextRequest) {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ASR not configured" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "file field is required" },
      { status: 400 },
    );
  }

  const upstream = new FormData();
  upstream.append("file", file, "dream.webm");
  upstream.append("model", "FunAudioLLM/SenseVoiceSmall");

  const base =
    process.env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1";
  const res = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `ASR ${res.status}: ${await res.text()}` },
      { status: 502 },
    );
  }
  const data = await res.json();
  return NextResponse.json({ text: data.text ?? "" });
}
