/* eslint-disable @next/next/no-img-element */
// 运行时 AI 生成插画的融合容器（v2 §4.1）。
// 三层处理：saturate(0.85) 压饱和 / 深色遮罩拉回主色调 / mask 底部渐隐消硬边。
// 无 src 时回退到占位（.art-ph 自带同样三层）。
export default function DreamImage({
  src,
  alt = "",
  className = "h-[46vh] w-full",
}: {
  src?: string | null;
  alt?: string;
  className?: string;
}) {
  if (!src) {
    return <div aria-hidden className={`art-ph ${className}`} />;
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
        style={{
          filter: "saturate(0.85)",
          maskImage: "linear-gradient(to bottom, black 60%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, black 60%, transparent 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "rgba(11, 16, 38, 0.35)" }}
      />
    </div>
  );
}
