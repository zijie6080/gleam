import { NextRequest, NextResponse } from "next/server";
import { findSimilarDreams } from "@/lib/dreams";

// GET /api/dreams/:id/similar?count=10&min=0.5&excludeOwner=1
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const q = req.nextUrl.searchParams;

  try {
    const similar = await findSimilarDreams(id, {
      count: q.has("count") ? Number(q.get("count")) : undefined,
      minSimilarity: q.has("min") ? Number(q.get("min")) : undefined,
      excludeOwner: q.get("excludeOwner") === "1",
    });
    return NextResponse.json({ similar });
  } catch (e) {
    const msg = (e as Error).message;
    const status = msg.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
