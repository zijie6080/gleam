import { createClient } from "@supabase/supabase-js";

// 仅在服务端使用（API Routes）。RLS 全开且无策略，
// 数据访问必须走 service role，绝不能把 service key 暴露给客户端。
export function supabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars",
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
