"use client";

import { useEffect, useRef } from "react";

// 录音波形环：Web Audio AnalyserNode 驱动，替代静态占位圆（v2 §5.1）。
// 未录音时画一圈静止的细环。
export default function VoiceRing({
  stream,
  size = 288,
}: {
  stream: MediaStream | null;
  size?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);
    const cx = size / 2;
    const baseR = size / 2 - 36;

    let raf = 0;
    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let bins: Uint8Array | null = null;

    if (stream) {
      audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      bins = new Uint8Array(analyser.frequencyBinCount);
    }

    const draw = () => {
      ctx.clearRect(0, 0, size, size);
      const points = 96;
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const angle = (i / points) * Math.PI * 2;
        let r = baseR;
        if (analyser && bins) {
          analyser.getByteFrequencyData(bins as Uint8Array<ArrayBuffer>);
          const bin = bins[i % bins.length] / 255;
          r = baseR + bin * 26;
        }
        const x = cx + Math.cos(angle) * r;
        const y = cx + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = "rgba(232, 200, 138, 0.75)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "rgba(232, 200, 138, 0.5)";
      ctx.shadowBlur = 12;
      ctx.stroke();
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      audioCtx?.close();
    };
  }, [stream, size]);

  return <canvas ref={ref} style={{ width: size, height: size }} />;
}
