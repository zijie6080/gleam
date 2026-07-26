import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const scope = req.nextUrl.searchParams.get("scope");

  try {
    if (scope === "global") {
      const db = supabaseAdmin();
      const { count } = await db
        .from("dreams")
        .select("id", { count: "exact", head: true });
      return NextResponse.json({ totalDreams: count ?? 0 });
    }

    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;
    const { db, user } = auth;

    const { data: myDreams, error } = await db
      .from("dreams")
      .select("id, emotion_score, created_at")
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);

    const ids = (myDreams ?? []).map((dream) => dream.id);
    let iamtooCount = 0;
    if (ids.length > 0) {
      const { count } = await db
        .from("resonances_iamtoo")
        .select("dream_id", { count: "exact", head: true })
        .in("dream_id", ids);
      iamtooCount = count ?? 0;
    }

    const days: number[] = Array(35).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (const dream of myDreams ?? []) {
      const date = new Date(dream.created_at);
      date.setHours(0, 0, 0, 0);
      const difference = Math.round(
        (today.getTime() - date.getTime()) / 86_400_000,
      );
      if (difference < 0 || difference >= 35) continue;

      const index = 34 - difference;
      const score = dream.emotion_score;
      const intensity =
        score !== null && Math.abs(score) > 0.5
          ? 3
          : score !== null && Math.abs(score) > 0.2
            ? 2
            : 1;
      days[index] = Math.min(3, Math.max(days[index], intensity));
    }

    return NextResponse.json({
      dreamCount: ids.length,
      iamtooCount,
      days,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

