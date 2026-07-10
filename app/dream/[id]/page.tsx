import { notFound } from "next/navigation";
import DreamView, { type DreamData } from "@/components/DreamView";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function DreamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = supabaseAdmin();

  const { data: dream, error } = await db
    .from("dreams")
    .select("id, raw_text, lucidity, emotion_score, is_night_mode, created_at")
    .eq("id", id)
    .single();
  if (error || !dream) notFound();

  const { data: links } = await db
    .from("dream_motifs")
    .select("weight, motifs(name)")
    .eq("dream_id", id)
    .order("weight", { ascending: false });

  const motifs = (links ?? [])
    .map((l) => (l.motifs as unknown as { name: string })?.name)
    .filter(Boolean);

  return <DreamView dream={{ ...dream, motifs } as DreamData} />;
}
