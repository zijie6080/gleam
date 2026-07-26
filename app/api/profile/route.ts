import { NextRequest, NextResponse } from "next/server";
import { moderate, MODERATION_MESSAGE } from "@/lib/moderation";
import { requireUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { data } = await auth.db
    .from("profiles")
    .select("nickname, avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();

  return NextResponse.json({
    nickname: data?.nickname ?? "梦游者",
    avatarUrl: data?.avatar_url ?? null,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "表单内容无效" }, { status: 400 });
  }

  try {
    const { db, user } = auth;
    const patch: Record<string, unknown> = { updated_at: new Date() };

    const nickname = form.get("nickname");
    if (typeof nickname === "string" && nickname.trim()) {
      const clean = nickname.trim().slice(0, 12);
      if (!moderate(clean).ok) {
        return NextResponse.json({ error: MODERATION_MESSAGE }, { status: 422 });
      }
      patch.nickname = clean;
    }

    const avatar = form.get("avatar");
    if (avatar instanceof Blob && avatar.size > 0) {
      if (avatar.size > 2 * 1024 * 1024) {
        return NextResponse.json(
          { error: "头像不能超过 2MB" },
          { status: 413 },
        );
      }
      if (!["image/jpeg", "image/png", "image/webp"].includes(avatar.type)) {
        return NextResponse.json(
          { error: "头像只支持 JPG、PNG 或 WebP" },
          { status: 415 },
        );
      }

      const extension =
        avatar.type === "image/png"
          ? "png"
          : avatar.type === "image/webp"
            ? "webp"
            : "jpg";
      const path = `${user.id}.${extension}`;
      const { error: uploadError } = await db.storage
        .from("avatars")
        .upload(path, Buffer.from(await avatar.arrayBuffer()), {
          upsert: true,
          contentType: avatar.type,
        });
      if (uploadError) throw new Error(uploadError.message);

      const { data: publicUrl } = db.storage.from("avatars").getPublicUrl(path);
      patch.avatar_url = `${publicUrl.publicUrl}?v=${Date.now()}`;
    }

    const { data, error } = await db
      .from("profiles")
      .upsert({ id: user.id, ...patch }, { onConflict: "id" })
      .select("nickname, avatar_url")
      .single();
    if (error) throw new Error(error.message);

    return NextResponse.json({
      nickname: data.nickname,
      avatarUrl: data.avatar_url,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
