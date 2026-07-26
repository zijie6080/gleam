import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  const { db, user } = auth;
  const userId = user.id;

  try {
    const [
      { data: profile },
      { data: dreams, error },
      { data: echoes },
      { data: words },
      { data: reactions },
      { data: notifications },
      { data: conversations },
    ] = await Promise.all([
      db.from("profiles").select("nickname, avatar_url, updated_at").eq("id", userId).maybeSingle(),
      db
        .from("dreams")
        .select(
          "id, raw_text, emotion_score, lucidity, is_recurring, visibility, is_night_mode, created_at, dream_motifs(weight, motifs(name, category))",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: true }),
      db.from("echoes").select("dream_id, content, created_at").eq("user_id", userId),
      db.from("echo_words").select("dream_id, word").eq("user_id", userId),
      db.from("resonances_iamtoo").select("dream_id").eq("user_id", userId),
      db.from("notifications").select("type, payload, read, created_at").eq("user_id", userId),
      db
        .from("conversations")
        .select("id, opened_at, expires_at, created_at")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`),
    ]);

    if (error) throw new Error(error.message);

    const dreamIds = (dreams ?? []).map((dream) => dream.id);
    const conversationIds = (conversations ?? []).map((item) => item.id);

    const [{ data: stories }, { data: messages }] = await Promise.all([
      dreamIds.length
        ? db
            .from("stories")
            .select("dream_id, content, created_at")
            .in("dream_id", dreamIds)
        : Promise.resolve({ data: [] }),
      conversationIds.length
        ? db
            .from("conversation_messages")
            .select("conversation_id, sender, content, created_at")
            .in("conversation_id", conversationIds)
        : Promise.resolve({ data: [] }),
    ]);

    return new NextResponse(
      JSON.stringify(
        {
          exported_at: new Date().toISOString(),
          account: {
            id: user.id,
            email: user.email ?? null,
            created_at: user.created_at,
          },
          profile,
          dreams,
          stories: stories ?? [],
          comments_written: echoes ?? [],
          words_sent: words ?? [],
          resonances_sent: reactions ?? [],
          notifications: notifications ?? [],
          conversations: conversations ?? [],
          conversation_messages: messages ?? [],
        },
        null,
        2,
      ),
      {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": 'attachment; filename="gleam-data.json"',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}
