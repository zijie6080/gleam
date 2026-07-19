"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import OpenChatButton from "@/components/OpenChatButton";
import { fadeIn } from "@/lib/motion";
import { anonUserId } from "@/lib/user";

type Summary = {
  strong: number;
  weak: number;
  motif: string | null;
  window: "today" | "month" | "ever";
};

const WINDOW_LABEL = {
  today: "今晚",
  month: "这个月",
  ever: "曾经",
} as const;

// 广场顶部匹配：
// 强匹配（同梦）→ 横幅 + 48h 对话入口；
// 只有弱匹配（相似意象）→ 安静一行，无对话入口；
// 全无 → 不渲染。
export default function MatchBanner() {
  const [data, setData] = useState<Summary | null>(null);

  useEffect(() => {
    fetch(`/api/resonance/summary?userId=${anonUserId()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, []);

  if (!data || (data.strong === 0 && data.weak === 0)) return null;

  const when = WINDOW_LABEL[data.window] ?? "曾经";

  if (data.strong > 0) {
    return (
      <motion.section {...fadeIn} className="glass space-y-4 p-6">
        <p className="font-serif text-xl leading-relaxed text-ink">
          {when}，有{data.strong > 1 ? ` ${data.strong} 个` : ""}人和你梦见了
          {data.motif ? `「${data.motif}」` : "同一件事"}。
        </p>
        <OpenChatButton />
        <p className="text-xs text-muted">
          双方都同意才会开启 · 48 小时后自动关闭
        </p>
      </motion.section>
    );
  }

  return (
    <motion.p {...fadeIn} className="px-2 text-sm leading-relaxed text-muted">
      {when}，有 {data.weak} 个梦和你的梦隔着相似的影子。
    </motion.p>
  );
}
