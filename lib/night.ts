// 深夜模式与心理危机检测（v2 §6.1）
// 深夜模式：01:00–05:00 且情绪明显负面 → 不解读、不生成、不推送
// 危机内容：产品必须让路 → 不解读、不生成，直接给求助资源

const CRISIS_PATTERNS = [
  "自杀",
  "自残",
  "自伤",
  "想死",
  "不想活",
  "结束生命",
  "结束自己",
  "割腕",
  "轻生",
  "跳楼",
];

export function detectCrisis(text: string): boolean {
  return CRISIS_PATTERNS.some((p) => text.includes(p));
}

export function isNightMode(
  localHour: number | undefined,
  emotionScore: number | undefined,
): boolean {
  if (localHour === undefined || emotionScore === undefined) return false;
  return localHour >= 1 && localHour < 5 && emotionScore < -0.2;
}
