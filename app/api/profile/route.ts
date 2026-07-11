import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";

// 个人资料：昵称 + 头像。只对自己展示——全站无他人主页（v2 §1.4）。

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  const db = supabaseAdmin();
  const { data } = await db
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  return NextResponse.json({
    nickname: data?.nickname ?? "梦游者",
    avatarUrl: data?.avatar_url ?? null,
  });
}

// POST multipart/form-data: userId, nickname?, avatar?(file)
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const userId = form?.get("userId");
  if (typeof userId !== "string" || !userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  try {
    const db = supabaseAdmin();
    const patch: Record<string, unknown> = { updated_at: new Date() };

    const nickname = form?.get("nickname");
    if (typeof nickname === "string" && nickname.trim()) {
      const clean = nickname.trim().slice(0, 12);
      const check = moderate(clean);
      if (!check.ok) {
        return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
      }
      patch.nickname = clean;
    }

    const avatar = form?.get("avatar");
    if (avatar instanceof Blob && avatar.size > 0) {
      if (avatar.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "头像不能超过 2MB" },
          { status: 413 },
        );
      }
      const path = `${userId}.jpg`;
      const { error: upErr } = await db.storage
        .from("avatars")
        .upload(path, Buffer.from(await avatar.arrayBuffer()), {
          upsert: true,
          contentType: avatar.type || "image/jpeg",
        });
      if (upErr) throw new Error(upErr.message);
      const { data: pub } = db.storage.from("avatars").getPublicUrl(path);
      // 加时间戳破缓存
      patch.avatar_url = `${pub.publicUrl}?v=${Date.now()}`;
    }

    const { data, error } = await db
      .from("profiles")
      .upsert({ id: userId, ...patch }, { onConflict: "id" })
      .select("nickname, avatar_url")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({
      nickname: data.nickname,
      avatarUrl: data.avatar_url,
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
