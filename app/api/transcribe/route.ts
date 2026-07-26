import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "语音转写未配置" }, { status: 503 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "缺少录音文件" }, { status: 400 });
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "录音不能超过 12MB" },
      { status: 413 },
    );
  }
  if (file.type && !file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "文件不是音频" }, { status: 415 });
  }

  const upstream = new FormData();
  upstream.append("file", file, "dream.webm");
  upstream.append("model", "FunAudioLLM/SenseVoiceSmall");

  const base =
    process.env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1";
  const response = await fetch(`${base}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: upstream,
  });
  if (!response.ok) {
    return NextResponse.json(
      { error: `语音服务暂时不可用（${response.status}）` },
      { status: 502 },
    );
  }
  const data = await response.json();
  return NextResponse.json({ text: data.text ?? "" });
}

