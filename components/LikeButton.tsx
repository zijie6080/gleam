"use client";

import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { anonUserId } from "@/lib/user";

// 广场点赞（心形，可撤销）。数字弱化展示（gold-deep 小字）。
export default function LikeButton({
  dreamId,
  initialCount = 0,
}: {
  dreamId: string;
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    fetch(`/api/dreams/${dreamId}/like?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => {
        setCount(d.count ?? 0);
        setLiked(Boolean(d.liked));
      })
      .catch(() => {});
  }, [dreamId]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    // 乐观更新
    setLiked((v) => !v);
    setCount((c) => c + (liked ? -1 : 1));
    const res = await fetch(`/api/dreams/${dreamId}/like`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => null);
    if (res?.ok) {
      const d = await res.json();
      setCount(d.count ?? 0);
      setLiked(Boolean(d.liked));
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 transition-opacity duration-fade hover:opacity-70"
      aria-label={liked ? "取消喜欢" : "喜欢"}
    >
      <Heart
        strokeWidth={1.5}
        className={`h-4 w-4 ${liked ? "text-gold" : "text-muted"}`}
        fill={liked ? "currentColor" : "none"}
      />
      {count > 0 && <span className="text-xs text-gold-deep">{count}</span>}
    </button>
  );
}
