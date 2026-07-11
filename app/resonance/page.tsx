import { Moon } from "lucide-react";
import Art from "@/components/Art";
import BottomNav from "@/components/BottomNav";
import OpenChatButton from "@/components/OpenChatButton";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// 产品心跳（v2 §6.2）：基于最近一个梦的 24h 相似匹配。
// 匹配数为 0 时不显示「有 0 个人」，给安静的空状态。
// 48h 匿名对话只能由系统发起（双方同意才开启），所以按钮仅在有匹配时出现。
export default async function ResonancePage() {
  const db = supabaseAdmin();

  const { data: latest } = await db
    .from("dreams")
    .select("id, embedding")
    .not("embedding", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let count = 0;
  let motif: string | null = null;

  if (latest) {
    const { data: c } = await db.rpc("count_recent_similar", {
      query_embedding: latest.embedding,
      self_dream: latest.id,
      min_similarity: 0.85,
    });
    count = c ?? 0;

    const { data: motifRow } = await db
      .from("dream_motifs")
      .select("weight, motifs(name)")
      .eq("dream_id", latest.id)
      .order("weight", { ascending: false })
      .limit(1)
      .maybeSingle();
    const m = motifRow?.motifs as unknown as
      | { name: string }
      | { name: string }[]
      | null;
    motif = (Array.isArray(m) ? m[0]?.name : m?.name) ?? null;
  }

  if (count === 0) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
        <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
          <Moon strokeWidth={1.5} className="h-8 w-8 text-gold" />
          <p className="font-serif text-2xl leading-relaxed tracking-wider text-ink">
            今晚还没有
            <br />
            和你梦见同一件事的人
          </p>
          <p className="text-sm leading-relaxed text-muted">
            梦会等。有人梦见时，你会知道。
          </p>
        </div>
        <BottomNav />
      </main>
    );
  }

  const orbs = Array.from({ length: Math.min(count, 24) }, (_, i) => i);
  const focusIndex = Math.min(15, orbs.length - 1);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <section className="space-y-14">
        <div className="flex items-center px-2">
          <Art className="aspect-square w-24 shrink-0 rounded-full" />
          <span aria-hidden className="h-px flex-1 bg-gold-deep" />
          <span className="rounded-full border border-gold-deep px-6 py-1.5 font-serif text-lg text-gold">
            {motif ?? "同一件事"}
          </span>
          <span aria-hidden className="h-px flex-1 bg-gold-deep" />
          <Art className="aspect-square w-24 shrink-0 rounded-full" />
        </div>

        <h1 className="text-center font-serif text-3xl leading-relaxed tracking-wider text-ink">
          今晚，有 {count} 个人和你
          <br />
          梦见了同一件事
        </h1>

        <div className="grid grid-cols-6 gap-x-4 gap-y-8">
          {orbs.map((i) =>
            i === focusIndex ? (
              <div key={i} className="relative">
                <span className="absolute -inset-1.5 rounded-full border border-gold" />
                <Art className="aspect-square w-full rounded-full" />
              </div>
            ) : (
              <Art key={i} className="aspect-square w-full rounded-full" />
            ),
          )}
        </div>
      </section>

      <section className="mt-auto space-y-4 pt-16 text-center">
        <OpenChatButton />
        <p className="text-sm text-muted">双方都同意才会开启 · 48 小时后自动关闭</p>
      </section>

      <BottomNav />
    </main>
  );
}
