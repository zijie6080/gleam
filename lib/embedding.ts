// 文本 embedding：DeepSeek 无 embedding API，
// 默认走 SiliconFlow 的 BGE-M3（OpenAI 兼容，1024 维），provider 可用 env 替换。
// 注意：换模型必须同步改库里 dreams.embedding 的向量维度。

const DIM = 1024;

export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.EMBEDDING_API_KEY;
  if (!apiKey) throw new Error("Missing EMBEDDING_API_KEY env var");

  const baseUrl =
    process.env.EMBEDDING_BASE_URL ?? "https://api.siliconflow.cn/v1";
  const model = process.env.EMBEDDING_MODEL ?? "BAAI/bge-m3";

  const res = await fetch(`${baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, input: text.slice(0, 8000) }),
  });

  if (!res.ok) {
    throw new Error(`Embedding API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  const vector: number[] = data.data[0].embedding;
  if (vector.length !== DIM) {
    throw new Error(
      `Embedding dimension mismatch: got ${vector.length}, schema expects ${DIM}`,
    );
  }
  return vector;
}
