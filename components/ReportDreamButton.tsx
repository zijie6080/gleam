"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { anonUserId } from "@/lib/user";

// 举报公开的梦：机审之外的人工兜底入口。不打扰，一个小图标。
export default function ReportDreamButton({ dreamId }: { dreamId: string }) {
  const [done, setDone] = useState(false);

  async function report() {
    if (done) return;
    if (!window.confirm("举报这个梦？我们会尽快复核。")) return;
    setDone(true);
    await fetch(`/api/dreams/${dreamId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: anonUserId() }),
    }).catch(() => {});
  }

  return (
    <button
      onClick={report}
      disabled={done}
      aria-label="举报"
      className="flex items-center gap-1.5 text-muted transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
    >
      <Flag strokeWidth={1.5} className="h-4 w-4" />
      {done && <span className="text-xs">已收到</span>}
    </button>
  );
}
