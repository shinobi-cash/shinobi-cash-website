/**
 * Indexer API Proxy
 * Handles all indexer requests server-side to hide API tokens from client
 *
 * SECURITY: API tokens are server-side only (not NEXT_PUBLIC_*)
 * @file app/api/indexer/route.ts
 */

import { NextResponse } from "next/server";
import { IndexerClient, convertBigIntsToStrings } from "@shinobi-cash/data";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

// Server-side indexer configuration (credentials never exposed to client)
const INDEXER_ENDPOINT =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_URL_DEV || "http://localhost:42069/proxy/graphql"
    : process.env.INDEXER_URL_PROD ||
      "https://api.thegraph.com/subgraphs/name/shinobi-cash/privacy-pools-v1";

const INDEXER_TOKEN =
  process.env.NODE_ENV === "development"
    ? process.env.INDEXER_TOKEN_DEV
    : process.env.INDEXER_TOKEN_PROD;

// Create server-side only client
const serverClient = new IndexerClient({
  endpoint: INDEXER_ENDPOINT,
  headers: {
    "Content-Type": "application/json",
    "User-Agent": "shinobi-cash-api/1.0.0",
    ...(INDEXER_TOKEN && { Authorization: `Bearer ${INDEXER_TOKEN}` }),
  },
  timeout: 30000,
});

// Cache TTL for different endpoints
const CACHE_CONFIG = {
  activities: 10, // 10 seconds (real-time data)
  stateTree: 30, // 30 seconds (changes occasionally)
  aspRoot: 60, // 1 minute (updates periodically)
  health: 5, // 5 seconds
} as const;

// Request body types
interface IndexerRequest {
  endpoint:
    | "activities"
    | "stateTree"
    | "aspRoot"
    | "health"
    | "latestBlock";
  params?: {
    poolAddress?: string;
    poolId?: string;
    limit?: number;
    after?: string;
    orderDirection?: "asc" | "desc";
  };
}

/**
 * POST /api/indexer
 * Proxy endpoint for all indexer queries
 */
export async function POST(request: Request) {
  try {
    const body: IndexerRequest = await request.json();
    const { endpoint, params = {} } = body;

    let data: unknown;
    let cacheTTL = 30; // default

    // Route to appropriate SDK method
    switch (endpoint) {
      case "activities": {
        const poolId = (params.poolAddress || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
        data = await serverClient.getActivities({
          poolId,
          limit: params.limit || 100,
          orderDirection: params.orderDirection || "desc",
          after: params.after,
        });
        cacheTTL = CACHE_CONFIG.activities;
        break;
      }

      case "stateTree": {
        if (!params.poolId) {
          return NextResponse.json({ error: "poolId is required" }, { status: 400 });
        }
        data = await serverClient.getAllStateTreeLeaves(params.poolId);
        cacheTTL = CACHE_CONFIG.stateTree;
        break;
      }

      case "aspRoot": {
        data = await serverClient.getLatestASPRoot();
        if (!data || !(data as { root?: string }).root) {
          return NextResponse.json({ error: "No ASP root found" }, { status: 404 });
        }
        cacheTTL = CACHE_CONFIG.aspRoot;
        break;
      }

      case "health": {
        const health = await serverClient.healthCheck();
        data = { status: health.status === "ok" || health.status === "healthy" };
        cacheTTL = CACHE_CONFIG.health;
        break;
      }

      case "latestBlock": {
        data = await serverClient.getLatestIndexedBlock();
        cacheTTL = CACHE_CONFIG.health;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    }

    // Serialize BigInts before returning
    const serializedData = convertBigIntsToStrings(data);

    // Return with caching headers
    return NextResponse.json(
      { success: true, data: serializedData },
      {
        headers: {
          "Cache-Control": `s-maxage=${cacheTTL}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[Indexer API] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Indexer request failed",
      },
      { status: 500 }
    );
  }
}
