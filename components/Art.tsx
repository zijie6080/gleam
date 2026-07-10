// 运行时 AI 生成插画的占位容器，三层处理见 globals.css 的 .art-ph
export default function Art({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`art-ph ${className}`} />;
}
