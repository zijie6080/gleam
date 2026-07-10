import { redirect } from "next/navigation";

// 旧「回响详情」页已被 v2 信息架构合并进梦境详情（三级成本梯度在 DreamView 内）
export default function EchoPage() {
  redirect("/dream");
}
