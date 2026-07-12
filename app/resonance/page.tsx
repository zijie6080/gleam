import { redirect } from "next/navigation";

// 共鸣页已改为「共鸣广场」，AI 匹配横幅并入广场顶部
export default function ResonancePage() {
  redirect("/plaza");
}
