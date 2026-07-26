import { NextRequest, NextResponse } from "next/server";
import { matchLatestFor } from "@/lib/matching";
import { requireUser } from "@/lib/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;
  try {
    const tier = await matchLatestFor(auth.user.id);
    if (!tier) {
      return NextResponse.json({
        strong: 0,
        weak: 0,
        motif: null,
        window: "today",
      });
    }
    return NextResponse.json({
      strong: tier.strong.length,
      weak: tier.weak.length,
      motif: tier.motif,
      window: tier.window,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 },
    );
  }
}

