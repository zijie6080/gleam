import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 星图数据：embedding 经固定随机投影降到 2D（轻量替代 UMAP，数据量大后再换）。
// ?userId= 时只返回该用户的梦（前端已用 20 梦门槛控制入口）。
// 星座标签 = 出现 ≥2 次的主意象的质心，位置由数据算出，不再硬编码。

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 两个固定随机向量，把 1024 维压到 2 维（种子固定保证稳定）
function projectionAxes(dim: number) {
  const rand = seededRandom(42_2026);
  const ax: number[] = [];
  const ay: number[] = [];
  for (let i = 0; i < dim; i++) {
    ax.push(rand() * 2 - 1);
    ay.push(rand() * 2 - 1);
  }
  return { ax, ay };
}

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    const db = supabaseAdmin();
    let query = db
      .from("dreams")
      .select(
        "id, raw_text, created_at, embedding, dream_motifs(weight, motifs(name))",
      )
      .not("embedding", "is", null)
      .order("created_at", { ascending: false })
      .limit(300);
    if (userId) query = query.eq("user_id", userId);
    const { data: dreams, error } = await query;
    if (error) throw new Error(error.message);
    if (!dreams || dreams.length === 0) {
      return NextResponse.json({ points: [], clusters: [] });
    }

    const dim = 1024;
    const { ax, ay } = projectionAxes(dim);

    const raw = dreams.map((d) => {
      const v: number[] =
        typeof d.embedding === "string" ? JSON.parse(d.embedding) : d.embedding;
      let x = 0;
      let y = 0;
      for (let i = 0; i < dim; i++) {
        x += v[i] * ax[i];
        y += v[i] * ay[i];
      }
      const links = (d.dream_motifs ?? [])
        .slice()
        .sort(
          (a: { weight: number }, b: { weight: number }) =>
            b.weight - a.weight,
        );
      const top = links[0]?.motifs as unknown as { name: string } | undefined;
      const date = new Date(d.created_at);
      return {
        id: d.id,
        x,
        y,
        title: d.raw_text.slice(0, 10),
        date: `${date.getMonth() + 1}月${date.getDate()}日`,
        motif: top?.name ?? null,
      };
    });

    // 归一化到 0.08–0.92
    const xs = raw.map((p) => p.x);
    const ys = raw.map((p) => p.y);
    const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
    const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
    const norm = (v: number, min: number, max: number) =>
      max === min ? 0.5 : 0.08 + ((v - min) / (max - min)) * 0.84;
    const points = raw.map((p) => ({
      ...p,
      x: norm(p.x, minX, maxX),
      y: norm(p.y, minY, maxY),
    }));

    // 星座：同一主意象 ≥2 个梦，标签放质心
    const byMotif = new Map<string, { x: number; y: number; n: number }>();
    for (const p of points) {
      if (!p.motif) continue;
      const c = byMotif.get(p.motif) ?? { x: 0, y: 0, n: 0 };
      c.x += p.x;
      c.y += p.y;
      c.n += 1;
      byMotif.set(p.motif, c);
    }
    const clusters = [...byMotif.entries()]
      .filter(([, c]) => c.n >= 2)
      .sort((a, b) => b[1].n - a[1].n)
      .slice(0, 5)
      .map(([name, c]) => ({
        name: `${name}星座`,
        x: c.x / c.n,
        y: c.y / c.n,
      }));

    return NextResponse.json({ points, clusters });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
