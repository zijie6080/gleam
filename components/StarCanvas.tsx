"use client";

import { useEffect, useRef } from "react";

// 固定种子的伪随机，保证每次渲染的星空一致（占位数据，不接真实数据）
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// 三个占位星座的归一化节点（x, y ∈ 0..1）
export const constellations = [
  {
    name: "追逐星座",
    label: { x: 0.16, y: 0.27 },
    nodes: [
      [0.13, 0.13],
      [0.22, 0.1],
      [0.3, 0.16],
      [0.24, 0.22],
      [0.34, 0.3],
    ],
  },
  {
    name: "水之星座",
    label: { x: 0.72, y: 0.56 },
    nodes: [
      [0.78, 0.38],
      [0.9, 0.44],
      [0.86, 0.52],
      [0.93, 0.58],
      [0.8, 0.6],
    ],
  },
  {
    name: "坠落星座",
    label: { x: 0.2, y: 0.72 },
    nodes: [
      [0.32, 0.62],
      [0.24, 0.7],
      [0.16, 0.78],
      [0.24, 0.82],
      [0.2, 0.88],
    ],
  },
] as const;

// 高亮星（tooltip 锚点）
export const focusStar = { x: 0.42, y: 0.42 };

export default function StarCanvas() {
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
    ctx.scale(dpr, dpr);

    const rand = seededRandom(20260710);

    // 背景散点星（月白 + 金，两种既有色）
    for (let i = 0; i < 420; i++) {
      const x = rand() * width;
      const y = rand() * height;
      const r = rand() * 1.4 + 0.2;
      const gold = rand() < 0.3;
      const alpha = rand() * 0.6 + 0.15;
      ctx.fillStyle = gold
        ? `rgba(232, 200, 138, ${alpha})`
        : `rgba(245, 241, 232, ${alpha * 0.8})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // 星座连线与节点
    for (const c of constellations) {
      ctx.strokeStyle = "rgba(232, 200, 138, 0.3)";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      c.nodes.forEach(([nx, ny], i) => {
        const px = nx * width;
        const py = ny * height;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.stroke();

      for (const [nx, ny] of c.nodes) {
        const px = nx * width;
        const py = ny * height;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 8);
        glow.addColorStop(0, "rgba(232, 200, 138, 0.9)");
        glow.addColorStop(1, "rgba(232, 200, 138, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 星座间的长连线（贯穿高亮星）
    ctx.strokeStyle = "rgba(232, 200, 138, 0.2)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(0.34 * width, 0.3 * height);
    ctx.lineTo(focusStar.x * width, focusStar.y * height);
    ctx.lineTo(0.32 * width, 0.62 * height);
    ctx.stroke();

    // 高亮星：大光晕 + 亮核
    const fx = focusStar.x * width;
    const fy = focusStar.y * height;
    const halo = ctx.createRadialGradient(fx, fy, 0, fx, fy, 46);
    halo.addColorStop(0, "rgba(232, 200, 138, 0.9)");
    halo.addColorStop(0.25, "rgba(232, 200, 138, 0.35)");
    halo.addColorStop(1, "rgba(232, 200, 138, 0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(fx, fy, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(232, 200, 138, 0.4)";
    ctx.beginPath();
    ctx.arc(fx, fy, 26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(245, 241, 232, 0.95)";
    ctx.beginPath();
    ctx.arc(fx, fy, 4, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}
