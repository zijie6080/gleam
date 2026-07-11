// 关键词机审：拦截明显违规内容（色情 / 暴力血腥 / 引流广告）。
// 危机内容（自伤等）不在这里拦——那走 night.ts 的让路逻辑，永远优先。
// 机审只是第一道闸，宁松勿严：拦截时给安静的提示，不指责用户。

const BLOCKLIST: { category: string; words: string[] }[] = [
  {
    category: "explicit",
    words: ["操你", "草你", "口交", "做爱", "性交", "强奸", "轮奸", "淫", "约炮", "一夜情床照", "裸照"],
  },
  {
    category: "violence",
    words: ["杀了你", "弄死你", "砍死", "灭门", "屠杀", "碎尸", "虐杀"],
  },
  {
    category: "spam",
    words: ["加微信", "加vx", "加V", "扫码", "代购", "刷单", "贷款", "博彩", "赌场", "发票"],
  },
];

export type ModerationResult = { ok: true } | { ok: false; category: string };

export function moderate(text: string): ModerationResult {
  const t = text.toLowerCase();
  for (const { category, words } of BLOCKLIST) {
    if (words.some((w) => t.includes(w.toLowerCase()))) {
      return { ok: false, category };
    }
  }
  return { ok: true };
}

// 统一的拒绝文案：不指责，不解释规则细节
export const MODERATION_MESSAGE = "这段话不适合留在这里。换个说法试试。";
