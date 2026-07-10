import Link from "next/link";
import { Sparkles, Waves } from "lucide-react";
import Art from "@/components/Art";
import BottomNav from "@/components/BottomNav";
import IamtooButton from "@/components/IamtooButton";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// 回响广场：二级页面（入口在梦境详情的「投放回响」）。
// 只展示 visibility = public 的梦——默认私有，发布需显式操作。
export default async function PlazaPage() {
  const db = supabaseAdmin();
  const { data: dreams } = await db
    .from("dreams")
    .select("id, raw_text, created_at, dream_motifs(motifs(name))")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(20);

  const cards = (dreams ?? []).map((d) => ({
    id: d.id,
    text: d.raw_text,
    tags: (d.dream_motifs ?? [])
      .map((l) => (l.motifs as unknown as { name: string })?.name)
      .filter(Boolean)
      .slice(0, 4),
  }));

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-6 pb-32 pt-14">
      <header className="space-y-2 px-2">
        <h1 className="font-serif text-4xl text-ink">回响广场</h1>
        <p className="text-xs text-muted">以下为文化视角参考，非心理诊断</p>
      </header>

      {cards.length === 0 && (
        <div className="flex flex-col items-center gap-6 pt-24 text-center">
          <Waves strokeWidth={1.5} className="h-8 w-8 text-gold" />
          <p className="font-serif text-xl leading-relaxed text-ink">
            广场还很安静。
          </p>
          <p className="text-sm leading-relaxed text-muted">
            梦默认只属于你自己。
            <br />
            在梦的详情里选择「投放回响」，它才会出现在这里。
          </p>
          <Link
            href="/capture"
            className="glass px-10 py-3 font-serif text-gold transition-opacity duration-fade hover:opacity-70"
          >
            先去记一个梦
          </Link>
        </div>
      )}

      {cards.map((card) => (
        <article key={card.id} className="glass space-y-4 p-5">
          <div className="flex gap-5">
            <Art className="h-24 w-24 shrink-0 rounded-glass" />
            <div className="space-y-3">
              <Link
                href={`/dream/${card.id}`}
                className="block font-serif text-lg leading-snug text-ink transition-opacity duration-fade hover:opacity-70"
              >
                {card.text.slice(0, 40)}
                {card.text.length > 40 ? "…" : ""}
              </Link>
              {card.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {card.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gold-deep px-2.5 py-0.5 text-xs text-gold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <IamtooButton dreamId={card.id} />
        </article>
      ))}

      {cards.length > 0 && (
        <p className="flex items-center gap-2 px-2 text-xs text-muted">
          <Sparkles strokeWidth={1.5} className="h-3.5 w-3.5" />
          回响不落空：每个梦都会先收到 AI 的意象拆解
        </p>
      )}

      <BottomNav />
    </main>
  );
}
