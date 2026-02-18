import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET() {
  const status = await indexerClient.health();

  return NextResponse.json(
    { success: true, data: { status } },
    {
      headers: {
        "Cache-Control": `s-maxage=${CACHE_TTL.health}, stale-while-revalidate`,
      },
    }
  );
}
