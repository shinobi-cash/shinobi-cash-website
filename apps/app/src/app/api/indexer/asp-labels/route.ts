import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET() {
  try {
    const labels = await indexerClient.asp.fetchAllApprovedLabels();

    return NextResponse.json(
      { success: true, data: { labels } },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.aspLabels}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] asp-labels error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch ASP labels" },
      { status: 500 }
    );
  }
}
