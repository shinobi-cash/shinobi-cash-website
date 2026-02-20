import { NextResponse } from "next/server";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const intentType = searchParams.get("intentType") as "DEPOSIT" | "WITHDRAWAL" | undefined;
    const phase = searchParams.get("phase") as
      | "ESCROWED"
      | "FILLED"
      | "FINALIZED"
      | "REFUNDED"
      | undefined;
    const limit = Number(searchParams.get("limit") || 100);
    const offset = Number(searchParams.get("offset") || 0);

    const response = await indexerClient.intent.fetch(
      { intentType: intentType || undefined, phase: phase || undefined },
      { limit, offset }
    );

    return NextResponse.json(
      { success: true, data: response },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.intents}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] intents error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch intents" },
      { status: 500 }
    );
  }
}
