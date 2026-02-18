import { NextResponse } from "next/server";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pool = (searchParams.get("pool") || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
    const limit = Number(searchParams.get("limit") || 100);
    const offset = Number(searchParams.get("offset") || 0);

    const response = await indexerClient.activity.fetch({ pool }, { limit, offset });

    return NextResponse.json(
      { success: true, data: response },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.activities}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] activities error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch activities",
      },
      { status: 500 }
    );
  }
}
