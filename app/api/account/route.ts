import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function DELETE(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { db, user } = auth;
  const userId = user.id;

  try {
    const { data: dreams } = await db
      .from("dreams")
      .select("id")
      .eq("user_id", userId);
    const dreamIds = (dreams ?? []).map((dream) => dream.id);

    const { data: conversations } = await db
      .from("conversations")
      .select("id")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`);
    const conversationIds = (conversations ?? []).map((item) => item.id);

    if (conversationIds.length > 0) {
      await db
        .from("conversation_messages")
        .delete()
        .in("conversation_id", conversationIds);
      await db
        .from("reports")
        .delete()
        .eq("target_type", "conversation")
        .in("target_id", conversationIds);
      await db.from("conversations").delete().in("id", conversationIds);
    }

    if (dreamIds.length > 0) {
      await db
        .from("reports")
        .delete()
        .eq("target_type", "dream")
        .in("target_id", dreamIds);
      await db.from("stories").delete().in("dream_id", dreamIds);
      await db.from("dream_likes").delete().in("dream_id", dreamIds);
      await db.from("dream_motifs").delete().in("dream_id", dreamIds);
    }

    await Promise.all([
      db.from("reports").delete().eq("reporter_id", userId),
      db.from("resonances_iamtoo").delete().eq("user_id", userId),
      db.from("echo_words").delete().eq("user_id", userId),
      db.from("echoes").delete().eq("user_id", userId),
      db.from("notifications").delete().eq("user_id", userId),
      db.from("push_subscriptions").delete().eq("user_id", userId),
      db.from("device_registrations").delete().eq("user_id", userId),
    ]);

    await db.from("dreams").delete().eq("user_id", userId);
    await db.from("profiles").delete().eq("id", userId);
    await db.storage
      .from("avatars")
      .remove([`${userId}.jpg`, `${userId}.png`, `${userId}.webp`]);

    const { error } = await db.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
