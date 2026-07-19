import { notFound } from "next/navigation";
import DreamImage from "@/components/DreamImage";
import BottomNav from "@/components/BottomNav";
import IamtooButton from "@/components/IamtooButton";
import LikeButton from "@/components/LikeButton";
import CommentSection from "@/components/CommentSection";
import ReportDreamButton from "@/components/ReportDreamButton";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// 广场梦境详情：看别人的公开梦。发布者匿名，可点赞、我也是、评论。
// 与 /dream/[id]（自己的私密日记）区分。
export default async function PlazaDreamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: dream, error } = await db
    .from("dreams")
    .select("id, raw_text, visibility, created_at")
    .eq("id", id)
    .single();
  // 只有公开的梦能在广场看
  if (error || !dream || dream.visibility !== "public") notFound();

  const { data: links } = await db
    .from("dream_motifs")
    .select("weight, motifs(name)")
    .eq("dream_id", id)
    .order("weight", { ascending: false });
  const motifs = (links ?? [])
    .map((l) => (l.motifs as unknown as { name: string })?.name)
    .filter(Boolean);

  const date = new Date(dream.created_at);
  const dateStr = `${date.getMonth() + 1}月${date.getDate()}日`;
  const lines: string[] = dream.raw_text.split("\n").filter(Boolean);

  return (
    <main className="mx-auto min-h-screen max-w-md pb-32">
      <DreamImage src={null} />

      <div className="space-y-6 px-6">
        <div className="space-y-2">
          <h1 className="font-serif text-3xl leading-snug text-ink">
            {(lines[0]?.slice(0, 12) ?? "一个梦").replace(/[，。、；：,.;:]+$/, "")}
          </h1>
          <p className="text-sm text-muted">匿名 · {dateStr}</p>
        </div>

        {motifs.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {motifs.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-gold-deep px-5 py-1.5 text-sm text-gold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="space-y-2 leading-relaxed text-ink">
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>

        <IamtooButton dreamId={id} />

        <div className="flex items-center gap-6 px-1">
          <LikeButton dreamId={id} />
          <span className="ml-auto">
            <ReportDreamButton dreamId={id} />
          </span>
        </div>

        <p className="pt-2 text-xs text-muted">以下为文化视角参考，非心理诊断</p>

        <CommentSection dreamId={id} />
      </div>

      <BottomNav />
    </main>
  );
}
