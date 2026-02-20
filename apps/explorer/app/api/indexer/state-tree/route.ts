import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get("poolId");

    if (!poolId) {
      return NextResponse.json({ success: false, error: "poolId is required" }, { status: 400 });
    }

    const limit = Number(searchParams.get("limit") || 1000);
    const offset = Number(searchParams.get("offset") || 0);

    const response = await indexerClient.stateTree.fetch(poolId, { limit, offset });

    return NextResponse.json(
      { success: true, data: response.data },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.stateTree}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] state-tree error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch state tree",
      },
      { status: 500 }
    );
  }
}
