import Link from "next/link";
import { redirect } from "next/navigation";
import { Feather } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// /dream = 最近一个梦；一个都没有时给空状态引导（v2 §8）
export default async function DreamIndexPage() {
  const db = supabaseAdmin();
  const { data: latest } = await db
    .from("dreams")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) redirect(`/dream/${latest.id}`);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pb-32 pt-14">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <Feather strokeWidth={1.5} className="h-8 w-8 text-gold" />
        <p className="font-serif text-2xl leading-relaxed text-ink">
          你还没有留下过梦。
        </p>
        <p className="text-sm leading-relaxed text-muted">
          醒来的五分钟里，梦最完整。
          <br />
          下次醒来，说给我听。
        </p>
        <Link
          href="/capture"
          className="glass px-10 py-3 font-serif text-lg text-gold transition-opacity duration-fade hover:opacity-70"
        >
          去记录
        </Link>
      </div>
      <BottomNav />
    </main>
  );
}
