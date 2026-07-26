import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

async function ownedDream(req: NextRequest, id: string) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth;

  const { data } = await auth.db
    .from("dreams")
    .select("id")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (!data) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "没有找到这个梦" }, { status: 404 }),
    };
  }
  return auth;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await ownedDream(req, id);
  if (!auth.ok) return auth.response;

  const [{ data: dream, error }, { data: links }] = await Promise.all([
    auth.db
      .from("dreams")
      .select("id, raw_text, lucidity, emotion_score, is_night_mode, created_at")
      .eq("id", id)
      .eq("user_id", auth.user.id)
      .single(),
    auth.db
      .from("dream_motifs")
      .select("weight, motifs(name)")
      .eq("dream_id", id)
      .order("weight", { ascending: false }),
  ]);

  if (error || !dream) {
    return NextResponse.json({ error: "没有找到这个梦" }, { status: 404 });
  }
  const motifs = (links ?? [])
    .map((link) => (link.motifs as unknown as { name: string })?.name)
    .filter(Boolean);
  return NextResponse.json({ dream: { ...dream, motifs } });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await ownedDream(req, id);
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const text =
    typeof body.text === "string" ? body.text.trim().slice(0, 5000) : "";
  if (!text) {
    return NextResponse.json({ error: "梦境内容不能为空" }, { status: 400 });
  }

  const { error } = await auth.db
    .from("dreams")
    .update({ raw_text: text, embedding: null })
    .eq("id", id)
    .eq("user_id", auth.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await auth.db.from("dream_motifs").delete().eq("dream_id", id);
  return NextResponse.json({ ok: true, needsReprocess: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await ownedDream(req, id);
  if (!auth.ok) return auth.response;

  const { data: conversations } = await auth.db
    .from("conversations")
    .select("id")
    .or(`dream_a.eq.${id},dream_b.eq.${id}`);
  const conversationIds = (conversations ?? []).map((item) => item.id);
  if (conversationIds.length > 0) {
    await auth.db
      .from("conversation_messages")
      .delete()
      .in("conversation_id", conversationIds);
    await auth.db.from("conversations").delete().in("id", conversationIds);
  }

  await Promise.all([
    auth.db.from("stories").delete().eq("dream_id", id),
    auth.db.from("dream_likes").delete().eq("dream_id", id),
    auth.db.from("dream_motifs").delete().eq("dream_id", id),
    auth.db.from("echoes").delete().eq("dream_id", id),
    auth.db.from("echo_words").delete().eq("dream_id", id),
    auth.db.from("resonances_iamtoo").delete().eq("dream_id", id),
    auth.db.from("reports").delete().eq("target_type", "dream").eq("target_id", id),
  ]);
  const { error } = await auth.db
    .from("dreams")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

