/**
 * Indexer API Proxy
 * Handles all indexer requests server-side to hide API tokens from client
 *
 * SECURITY: API tokens are server-side only (not NEXT_PUBLIC_*)
 * @file app/api/indexer/route.ts
 */

import { NextResponse } from "next/server";
import { IndexerClient, serializeStateTreeLeaf } from "@shinobi-cash/data";
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
  poolStats: 30, // 30 seconds
  health: 5, // 5 seconds
  intents: 10, // 10 seconds (real-time data)
  intentDetails: 10, // 10 seconds
} as const;

// Request body types
interface IndexerRequest {
  endpoint:
    | "activities"
    | "stateTree"
    | "aspRoot"
    | "poolStats"
    | "poolConfig"
    | "health"
    | "latestBlock"
    | "intents"
    | "intentDetails";
  params?: {
    poolAddress?: string;
    poolId?: string;
    limit?: number;
    offset?: number;
    orderDirection?: "asc" | "desc";
    // Intent-specific params
    orderId?: string;
    intentType?: "DEPOSIT" | "WITHDRAWAL";
    phase?: "CREATED" | "ESCROWED" | "FILLED" | "FINALIZED" | "REFUNDED";
    originChainId?: string;
    destinationChainId?: string;
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

    // Use server-side client with protected credentials
    const client = serverClient;

    let data: unknown;
    let cacheTTL = 30; // default

    // Route to appropriate SDK method
    switch (endpoint) {
      case "activities": {
        const poolId = (params.poolAddress || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
        let activityBuilder = client
          .query()
          .activities()
          .byPool(poolId)
          .limit(params.limit || 100)
          .orderByTimestamp(params.orderDirection || "desc");
        if (params.offset !== undefined) {
          activityBuilder = activityBuilder.skip(params.offset);
        }
        data = await activityBuilder.executePaginatedSerialized();
        cacheTTL = CACHE_CONFIG.activities;
        break;
      }

      case "stateTree": {
        if (!params.poolId) {
          return NextResponse.json({ error: "poolId is required" }, { status: 400 });
        }
        const leaves = await client.getAllStateTreeLeaves(params.poolId);
        data = leaves.map(serializeStateTreeLeaf);
        cacheTTL = CACHE_CONFIG.stateTree;
        break;
      }

      case "aspRoot": {
        const latestUpdate = await client.getLatestASPRoot();
        if (!latestUpdate?.root || !latestUpdate?.ipfsCID) {
          return NextResponse.json({ error: "No ASP root found" }, { status: 404 });
        }
        data = {
          root: latestUpdate.root,
          ipfsCID: latestUpdate.ipfsCID,
          timestamp: latestUpdate.timestamp.toString(),
        };
        cacheTTL = CACHE_CONFIG.aspRoot;
        break;
      }

      case "poolStats": {
        const poolId = (params.poolAddress || SHINOBI_CASH_ETH_POOL.address).toLowerCase();
        const pool = await client.getPoolStats(poolId);
        if (!pool) {
          data = null;
        } else {
          // Convert crosschain stats maps to serializable format
          const crosschainDepositsByChain: Record<string, { count: number; totalAmount: string }> =
            {};
          for (const [chainId, stats] of Object.entries(pool.crosschainDepositsByChain)) {
            crosschainDepositsByChain[chainId] = {
              count: Number(stats.count),
              totalAmount: stats.totalAmount.toString(),
            };
          }

          const crosschainWithdrawalsByChain: Record<
            string,
            { count: number; totalAmount: string }
          > = {};
          for (const [chainId, stats] of Object.entries(pool.crosschainWithdrawalsByChain)) {
            crosschainWithdrawalsByChain[chainId] = {
              count: Number(stats.count),
              totalAmount: stats.totalAmount.toString(),
            };
          }

          data = {
            totalDeposits: pool.totalDeposits.toString(),
            totalWithdrawals: pool.totalWithdrawals.toString(),
            depositCount: Number(pool.depositCount),
            withdrawalCount: Number(pool.withdrawalCount),
            uniqueDepositors: Number(pool.uniqueDepositors),
            crosschainDepositsByChain,
            crosschainWithdrawalsByChain,
            ragequitCount: Number(pool.ragequitCount),
            totalRagequitAmount: pool.totalRagequitAmount.toString(),
            createdAt: pool.createdAt.toString(),
          };
        }
        cacheTTL = CACHE_CONFIG.poolStats;
        break;
      }

      case "poolConfig": {
        if (!params.poolId) {
          return NextResponse.json({ error: "poolId is required" }, { status: 400 });
        }
        const result = await client.getPoolStats(params.poolId);
        if (!result) {
          data = null;
        } else {
          data = {
            id: result.id,
            totalDeposits: result.totalDeposits.toString(),
            totalWithdrawals: result.totalWithdrawals.toString(),
            depositCount: Number(result.depositCount),
            createdAt: result.createdAt.toString(),
          };
        }
        cacheTTL = CACHE_CONFIG.poolStats;
        break;
      }

      case "health": {
        const health = await client.healthCheck();
        data = { status: health.status === "healthy" };
        cacheTTL = CACHE_CONFIG.health;
        break;
      }

      case "latestBlock": {
        data = await client.getLatestIndexedBlock();
        cacheTTL = CACHE_CONFIG.health;
        break;
      }

      case "intents": {
        let intentBuilder = client
          .query()
          .intents()
          .limit(params.limit || 100)
          .orderByTimestamp(params.orderDirection || "desc");
        if (params.offset !== undefined) intentBuilder = intentBuilder.skip(params.offset);
        if (params.intentType) intentBuilder = intentBuilder.byType(params.intentType);
        if (params.phase) intentBuilder = intentBuilder.byPhase(params.phase);
        if (params.orderId) intentBuilder = intentBuilder.searchOrderId(params.orderId);
        if (params.originChainId) intentBuilder = intentBuilder.fromChain(BigInt(params.originChainId));
        if (params.destinationChainId) intentBuilder = intentBuilder.toChain(BigInt(params.destinationChainId));
        data = await intentBuilder.executePaginatedSerialized();
        cacheTTL = CACHE_CONFIG.intents;
        break;
      }

      case "intentDetails": {
        if (!params.orderId) {
          return NextResponse.json({ error: "orderId is required" }, { status: 400 });
        }
        const intentDetails = await client.query().intents().getWithTimelineSerialized(params.orderId);
        if (!intentDetails) {
          return NextResponse.json({ error: "Intent not found" }, { status: 404 });
        }
        data = intentDetails;
        cacheTTL = CACHE_CONFIG.intentDetails;
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
    }

    // Return with caching headers (data is already serialized by query builders)
    return NextResponse.json(
      { success: true, data },
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
