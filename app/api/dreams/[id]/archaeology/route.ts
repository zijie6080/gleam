import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 意象考古（v2 §6.3）：
// 触发规律 = 中低频意象第 2 次重现，间隔 ≥ 10 天（排除全站 Top 10）
// 第 1 个梦不依赖个人历史，用全站数据给对比。
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const db = supabaseAdmin();

    const { data: dream, error } = await db
      .from("dreams")
      .select("user_id, created_at")
      .eq("id", id)
      .single();
    if (error) {
      return NextResponse.json({ error: "dream not found" }, { status: 404 });
    }

    // 本梦的意象
    const { data: links, error: linkErr } = await db
      .from("dream_motifs")
      .select("motif_id, motifs(name, global_count)")
      .eq("dream_id", id);
    if (linkErr) throw new Error(linkErr.message);
    const motifRows = (links ?? []).map((l) => {
      const m = l.motifs as unknown as { name: string; global_count: number };
      return { id: l.motif_id as string, name: m.name, count: m.global_count };
    });
    if (motifRows.length === 0) {
      return NextResponse.json({ findings: [] });
    }

    // 全站 Top 10 高频意象（用户自己就知道"我老梦见水"，推出来是废话）
    const { data: topMotifs, error: topErr } = await db
      .from("motifs")
      .select("id")
      .order("global_count", { ascending: false })
      .limit(10);
    if (topErr) throw new Error(topErr.message);
    const topIds = new Set((topMotifs ?? []).map((m) => m.id));

    const findings: {
      type: "recurrence" | "global";
      motif: string;
      message: string;
    }[] = [];

    // 个人历史重现（需要 user_id 才能查个人史）
    if (dream.user_id) {
      const { data: myDreams, error: mdErr } = await db
        .from("dreams")
        .select("id, created_at")
        .eq("user_id", dream.user_id)
        .neq("id", id)
        .lt("created_at", dream.created_at);
      if (mdErr) throw new Error(mdErr.message);
      const myIds = (myDreams ?? []).map((d) => d.id);
      const dates = new Map(
        (myDreams ?? []).map((d) => [d.id, d.created_at as string]),
      );

      if (myIds.length > 0) {
        for (const motif of motifRows) {
          if (topIds.has(motif.id)) continue; // 排除头部高频
          const { data: prev, error: prevErr } = await db
            .from("dream_motifs")
            .select("dream_id")
            .eq("motif_id", motif.id)
            .in("dream_id", myIds);
          if (prevErr) throw new Error(prevErr.message);

          // 第 2 次重现：之前恰好出现过 1 次，且间隔 ≥ 10 天
          if ((prev ?? []).length === 1) {
            const prevDate = new Date(dates.get(prev![0].dream_id)!);
            const gapDays =
              (new Date(dream.created_at).getTime() - prevDate.getTime()) /
              86400000;
            if (gapDays >= 10) {
              const dateStr = `${prevDate.getMonth() + 1}月${prevDate.getDate()}日`;
              findings.push({
                type: "recurrence",
                motif: motif.name,
                message: `「${motif.name}」——这是第 2 次。上一次是 ${dateStr}。`,
              });
            }
          }
        }
      }
    }

    // 第 1 个梦（或无个人重现时）：全站对比
    if (findings.length === 0) {
      const { count: totalDreams } = await db
        .from("dreams")
        .select("id", { count: "exact", head: true });
      const strongest = motifRows.sort((a, b) => b.count - a.count)[0];
      if (strongest && totalDreams && totalDreams > 0) {
        const pct = Math.round((strongest.count / totalDreams) * 100);
        if (pct > 0) {
          findings.push({
            type: "global",
            motif: strongest.name,
            message: `「${strongest.name}」是常出现在人类梦境里的意象之一——全站 ${pct}% 的梦里有它。`,
          });
        }
      }
    }

    return NextResponse.json({ findings });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
