"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

// 首屏心跳：有未读共鸣通知时在记录页顶部浮出，点开去共鸣页，关掉即已读
export default function HeartbeatBanner() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/notifications?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => {
        const list = (d.notifications ?? []).filter(
          (n: { type: string }) => n.type === "resonance",
        );
        setIds(list.map((n: { id: string }) => n.id));
      })
      .catch(() => {});
  }, []);

  function dismiss() {
    fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId(), ids }),
    }).catch(() => {});
    setIds([]);
  }

  if (ids.length === 0) return null;

  return (
    <motion.div {...fadeIn} className="glass mb-6 flex items-center gap-3 p-4">
      <Link
        href="/plaza"
        onClick={dismiss}
        className="flex-1 font-serif text-ink transition-opacity duration-fade hover:opacity-70"
      >
        昨晚，有人和你梦见了同一件事。
      </Link>
      <button
        onClick={dismiss}
        aria-label="关闭"
        className="text-muted transition-opacity duration-fade hover:opacity-70"
      >
        <X strokeWidth={1.5} className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
