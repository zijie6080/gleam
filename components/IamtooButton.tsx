"use client";

import { useState } from "react";
import { anonUserId } from "@/lib/user";

// 第一级社交：「我也是」。不是点赞——它说的是"你不孤独"。
// 点击后不可撤销；梦主只会看到聚合数字，永远看不到是谁。
export default function IamtooButton({ dreamId }: { dreamId: string }) {
  const [done, setDone] = useState(false);

  async function send() {
    if (done) return;
    setDone(true);
    await fetch(`/api/dreams/${dreamId}/iamtoo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => {});
  }

  return (
    <button
      onClick={send}
      disabled={done}
      className={`glass w-full py-3 font-serif transition-opacity duration-fade ${
        done ? "!border-gold text-gold" : "text-ink hover:opacity-70"
      }`}
    >
      {done ? "已共鸣" : "我也是"}
    </button>
  );
}
