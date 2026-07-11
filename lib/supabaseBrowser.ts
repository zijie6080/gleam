"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// 浏览器端 Supabase：只用于 Auth（匿名登录 / 邮箱账号）。
// 数据读写仍全部走服务端 API（RLS 无策略，anon key 读不到任何表）。
let client: SupabaseClient | null = null;

export function supabaseBrowser(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}
