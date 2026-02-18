import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

type Context = {
  params: Promise<{ txHash: string }>;
};

export async function GET(_request: Request, context: Context) {
  try {
    const { txHash } = await context.params;

    const detail = await indexerClient.activity.getByTxHash(txHash);
    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Activity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: detail },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.activities}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] activity detail error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch activity" },
      { status: 500 }
    );
  }
}
