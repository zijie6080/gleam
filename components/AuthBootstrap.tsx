"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

// 身份引导：优先 Supabase Auth（可跨设备恢复），失败则退回本地匿名 ID。
// 解析出的 uid 写进 localStorage 的 gleam_anon_id——全站代码统一从那里读，
// 因此登录态变化对其余代码完全透明。
// 首次从匿名 ID 升级到 Auth uid 时，自动把旧数据迁移过去。
export default function AuthBootstrap() {
  useEffect(() => {
    const KEY = "gleam_anon_id";
    const sb = supabaseBrowser();
    if (!sb) return; // 未配置 NEXT_PUBLIC 变量：维持本地匿名 ID

    (async () => {
      let { data } = await sb.auth.getSession();
      if (!data.session) {
        // 尝试匿名登录（项目未开启该 provider 时会失败，静默降级）
        const { data: anon } = await sb.auth.signInAnonymously();
        if (anon.session) data = { session: anon.session };
      }
      const session = data.session;
      if (!session) return;

      const uid = session.user.id;
      const old = localStorage.getItem(KEY);
      if (old && old !== uid) {
        // 旧匿名身份的数据迁到账号名下
        await fetch("/api/account/migrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: old, token: session.access_token }),
        }).catch(() => {});
      }
      localStorage.setItem(KEY, uid);
    })();
  }, []);

  return null;
}
