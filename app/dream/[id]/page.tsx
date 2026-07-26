"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import DreamView, { type DreamData } from "@/components/DreamView";
import BottomNav from "@/components/BottomNav";
import { authFetch } from "@/lib/apiClient";

export default function DreamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [dream, setDream] = useState<DreamData | null>(null);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    authFetch(`/api/dreams/${id}`)
      .then(async (response) => {
        if (!response.ok) {
          setMissing(true);
          return;
        }
        const data = await response.json();
        setDream(data.dream);
      })
      .catch(() => setMissing(true));
  }, [id]);

  if (missing) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="font-serif text-2xl text-ink">没有找到这个梦。</p>
        <Link href="/dreams" className="text-sm text-gold">
          返回我的梦境
        </Link>
        <BottomNav />
      </main>
    );
  }
  if (!dream) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center text-sm text-muted">
        正在翻找梦境…
      </main>
    );
  }
  return <DreamView dream={dream} />;
}
