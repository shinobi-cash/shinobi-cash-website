import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET() {
  try {
    const aspRoot = await indexerClient.asp.fetchLatestASPRoot();

    return NextResponse.json(
      { success: true, data: aspRoot },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.aspLabels}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] asp-root error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to fetch ASP root",
      },
      { status: 500 }
    );
  }
}
