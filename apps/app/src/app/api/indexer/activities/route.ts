import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Number(searchParams.get("limit") || 100);
    const offset = Number(searchParams.get("offset") || 0);

    const response = await indexerClient.activity.fetch({}, { limit, offset });

    return NextResponse.json(
      {
        success: true,
        data: {
          items: response.data,
          pageInfo: {
            hasNextPage: response.pagination.hasMore,
            total: response.pagination.total,
          },
        },
      },
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
