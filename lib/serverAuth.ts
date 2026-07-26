import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase";

type AuthSuccess = {
  ok: true;
  db: ReturnType<typeof supabaseAdmin>;
  user: User;
};

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

export type AuthResult = AuthSuccess | AuthFailure;

export async function requireUser(req: NextRequest): Promise<AuthResult> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ error: "请先登录" }, { status: 401 }),
    };
  }

  const db = supabaseAdmin();
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "登录已过期，请重新登录" },
        { status: 401 },
      ),
    };
  }

  return { ok: true, db, user: data.user };
}
