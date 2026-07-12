import Link from "next/link";
import { MessageCircle, Waves } from "lucide-react";
import Art from "@/components/Art";
import BottomNav from "@/components/BottomNav";
import IamtooButton from "@/components/IamtooButton";
import LikeButton from "@/components/LikeButton";
import MatchBanner from "@/components/MatchBanner";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// 共鸣广场：公开梦境信息流。发布者匿名；可点赞、可评论。
// 顶部为 AI 匹配横幅（有匹配才出现），下方是可刷的梦。
export default async function PlazaPage() {
  const db = supabaseAdmin();
  const { data: dreams } = await db
    .from("dreams")
    .select("id, raw_text, created_at, dream_motifs(motifs(name))")
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(30);

  const ids = (dreams ?? []).map((d) => d.id);

  // 评论数（批量取后在内存里计数）
  const commentCount = new Map<string, number>();
  const likeCount = new Map<string, number>();
  if (ids.length > 0) {
    const [{ data: echoes }, { data: likes }] = await Promise.all([
      db.from("echoes").select("dream_id").in("dream_id", ids),
      db.from("dream_likes").select("dream_id").in("dream_id", ids),
    ]);
    for (const e of echoes ?? [])
      commentCount.set(e.dream_id, (commentCount.get(e.dream_id) ?? 0) + 1);
    for (const l of likes ?? [])
      likeCount.set(l.dream_id, (likeCount.get(l.dream_id) ?? 0) + 1);
  }

  const cards = (dreams ?? []).map((d) => ({
    id: d.id,
    text: d.raw_text,
    tags: (d.dream_motifs ?? [])
      .map((l) => (l.motifs as unknown as { name: string })?.name)
      .filter(Boolean)
      .slice(0, 4),
    comments: commentCount.get(d.id) ?? 0,
    likes: likeCount.get(d.id) ?? 0,
  }));

  return (
    <main className="mx-auto min-h-screen max-w-md space-y-6 px-6 pb-32 pt-14">
      <header className="space-y-2 px-2">
        <h1 className="font-serif text-4xl text-ink">共鸣广场</h1>
        <p className="text-xs text-muted">以下为文化视角参考，非心理诊断</p>
      </header>

      <MatchBanner />

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
          <Link href={`/plaza/${card.id}`} className="flex gap-5">
            <Art className="h-24 w-24 shrink-0 rounded-glass" />
            <div className="space-y-3">
              <p className="font-serif text-lg leading-snug text-ink">
                {card.text.slice(0, 40)}
                {card.text.length > 40 ? "…" : ""}
              </p>
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
          </Link>

          <IamtooButton dreamId={card.id} />

          {/* 互动行：点赞 · 评论数 */}
          <div className="flex items-center gap-6 px-1">
            <LikeButton dreamId={card.id} initialCount={card.likes} />
            <Link
              href={`/plaza/${card.id}`}
              className="flex items-center gap-1.5 text-muted transition-opacity duration-fade hover:opacity-70"
            >
              <MessageCircle strokeWidth={1.5} className="h-4 w-4" />
              {card.comments > 0 && (
                <span className="text-xs text-gold-deep">{card.comments}</span>
              )}
            </Link>
          </div>
        </article>
      ))}

      <BottomNav />
    </main>
  );
}
