"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { anonUserId } from "@/lib/user";

// 48h 匿名对话入口：本方同意 → 双方都同意才开启。
// 系统发起（匹配由服务端算出），用户不能挑对象。
export default function OpenChatButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "waiting" | "none">("idle");

  async function open() {
    const res = await fetch("/api/resonance/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => null);
    if (!res) return;
    if (!res.ok) {
      setState("none");
      return;
    }
    const data = await res.json();
    if (data.opened) {
      router.push(`/chat/${data.conversationId}`);
    } else {
      setState("waiting");
    }
  }

  if (state === "waiting") {
    return (
      <p className="py-4 text-sm text-muted">
        已问过对方了。TA 也同意时，对话才会开启。
      </p>
    );
  }
  if (state === "none") {
    return (
      <p className="py-4 text-sm text-muted">这个匹配已经不在了。梦会再等。</p>
    );
  }
  return (
    <button
      onClick={open}
      className="glass w-full !border-gold-deep py-4 font-serif text-lg text-gold transition-opacity duration-fade hover:opacity-70"
    >
      开启 48 小时匿名对话
    </button>
  );
}
