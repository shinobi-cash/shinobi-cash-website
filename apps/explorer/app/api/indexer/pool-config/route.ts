import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const poolId = searchParams.get("poolId");

    if (!poolId) {
      return NextResponse.json({ success: false, error: "poolId is required" }, { status: 400 });
    }

    const pool = await indexerClient.pool.getByAddress(poolId);

    const data = pool
      ? {
          pool: pool.pool,
          asset: pool.asset,
          scope: pool.scope,
          timestamp: pool.timestamp,
          txHash: pool.txHash,
        }
      : null;

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.poolStats}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] pool-config error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch pool config",
      },
      { status: 500 }
    );
  }
}
