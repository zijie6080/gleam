"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import OpenChatButton from "@/components/OpenChatButton";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

// 广场顶部匹配横幅：AI 匹配到"和你梦见同一件事的人"时才出现。
// 有匹配 → 显示数字 + 48h 匿名对话入口。0 匹配不渲染（不显示"0 个人"）。
export default function MatchBanner() {
  const [data, setData] = useState<{ count: number; motif: string | null } | null>(
    null,
  );

  useEffect(() => {
    fetch(`/api/resonance/summary?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data || data.count === 0) return null;

  return (
    <motion.section {...fadeIn} className="glass space-y-4 p-6">
      <p className="font-serif text-xl leading-relaxed text-ink">
        今晚，有 {data.count} 个人和你梦见了
        {data.motif ? `「${data.motif}」` : "同一件事"}。
      </p>
      <OpenChatButton />
      <p className="text-xs text-muted">双方都同意才会开启 · 48 小时后自动关闭</p>
    </motion.section>
  );
}
