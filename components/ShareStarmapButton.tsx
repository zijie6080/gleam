"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";

// 星图截图分享：把星空画布合成一张带标题落款的 PNG 下载。
// 只用设计 tokens 的颜色。
export default function ShareStarmapButton({
  dreamCount,
}: {
  dreamCount: number;
}) {
  const [busy, setBusy] = useState(false);

  async function share() {
    if (busy) return;
    setBusy(true);
    try {
      const src = document.getElementById("star-canvas") as HTMLCanvasElement | null;
      if (!src) return;

      const W = 1080;
      const H = 1440;
      const out = document.createElement("canvas");
      out.width = W;
      out.height = H;
      const ctx = out.getContext("2d")!;

      // 夜色底
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, "#0B1026");
      bg.addColorStop(1, "#1E1B3A");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // 星空（保持比例铺进中部）
      const scale = Math.max(W / src.width, (H * 0.78) / src.height);
      const dw = src.width * scale;
      const dh = src.height * scale;
      ctx.drawImage(src, (W - dw) / 2, H * 0.08, dw, dh);

      // 标题与落款
      ctx.textAlign = "center";
      ctx.fillStyle = "#F5F1E8";
      ctx.font = "500 64px 'Noto Serif SC', serif";
      ctx.fillText("我的梦境星图", W / 2, 140);
      ctx.fillStyle = "#8A8AA3";
      ctx.font = "300 34px 'Noto Sans SC', sans-serif";
      ctx.fillText(`${dreamCount} 个梦，正在长成一片星空`, W / 2, 200);
      ctx.fillStyle = "#967C4E";
      ctx.font = "300 30px 'Noto Serif SC', serif";
      ctx.fillText("拾梦 Gleam", W / 2, H - 80);

      const url = out.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = url;
      a.download = "gleam-starmap.png";
      a.click();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={share}
      disabled={busy}
      aria-label="分享星图"
      className="glass flex h-11 w-11 items-center justify-center !rounded-full text-gold transition-opacity duration-fade hover:opacity-70 disabled:opacity-40"
    >
      <Share2 strokeWidth={1.5} className="h-5 w-5" />
    </button>
  );
}
