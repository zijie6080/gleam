import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// 个人统计：梦境数、被「我也是」总数（仅聚合数字，无任何身份信息）
// ?userId= 匿名设备 ID；不传则返回全站梦境数
export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  try {
    const db = supabaseAdmin();

    if (!userId) {
      const { count } = await db
        .from("dreams")
        .select("id", { count: "exact", head: true });
      return NextResponse.json({ totalDreams: count ?? 0 });
    }

    const { data: myDreams, error } = await db
      .from("dreams")
      .select("id")
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    const ids = (myDreams ?? []).map((d) => d.id);

    let iamtooCount = 0;
    if (ids.length > 0) {
      const { count } = await db
        .from("resonances_iamtoo")
        .select("dream_id", { count: "exact", head: true })
        .in("dream_id", ids);
      iamtooCount = count ?? 0;
    }

    return NextResponse.json({ dreamCount: ids.length, iamtooCount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
