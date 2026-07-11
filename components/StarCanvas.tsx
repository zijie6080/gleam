"use client";

import { useEffect, useRef } from "react";

// 星图画布：背景散点为固定种子的装饰星；
// 真实的梦以更亮的金色星点绘制（点位来自 /api/starmap 的降维投影）。
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export type StarPoint = { x: number; y: number };

export default function StarCanvas({
  points = [],
  focus = null,
}: {
  points?: StarPoint[];
  focus?: StarPoint | null;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // 背景装饰散点
    const rand = seededRandom(20260710);
    for (let i = 0; i < 420; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const r = rand() * 1.4 + 0.2;
      const gold = rand() < 0.3;
      const alpha = rand() * 0.5 + 0.1;
      ctx.fillStyle = gold
        ? `rgba(232, 200, 138, ${alpha})`
        : `rgba(245, 241, 232, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 真实的梦：亮金星点 + 光晕
    for (const p of points) {
      const px = p.x * width;
      const py = p.y * height;
      const glow = ctx.createRadialGradient(px, py, 0, px, py, 10);
      glow.addColorStop(0, "rgba(232, 200, 138, 0.9)");
      glow.addColorStop(1, "rgba(232, 200, 138, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(245, 241, 232, 0.9)";
      ctx.beginPath();
      ctx.arc(px, py, 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // 高亮星（最近的梦）
    if (focus) {
      const fx = focus.x * width;
      const fy = focus.y * height;
      const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 46);
      halo.addColorStop(0, "rgba(232, 200, 138, 0.9)");
      halo.addColorStop(0.25, "rgba(232, 200, 138, 0.35)");
      halo.addColorStop(1, "rgba(232, 200, 138, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(fx, fy, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(232, 200, 138, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(fx, fy, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(245, 241, 232, 0.95)";
      ctx.beginPath();
      ctx.arc(fx, fy, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, focus]);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
