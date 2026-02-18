import { NextResponse } from "next/server";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { indexerClient, CACHE_TTL } from "@/lib/indexer/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pool = (searchParams.get("pool") || SHINOBI_CASH_ETH_POOL.address).toLowerCase();

    const statsResponse = await indexerClient.stats.fetch({ pool });

    const depositStats = statsResponse.deposits[0];
    const withdrawalStats = statsResponse.withdrawals[0];
    const ragequitStats = statsResponse.ragequits?.[0];

    const data = {
      totalDeposits: depositStats?.totalDeposited || "0",
      totalWithdrawals: withdrawalStats?.totalWithdrawn || "0",
      depositCount: Number(depositStats?.depositCount || 0),
      withdrawalCount: Number(withdrawalStats?.withdrawalCount || 0),
      uniqueDepositors: Number(depositStats?.uniqueDepositors || 0),
      totalVettingFees: depositStats?.totalVettingFees || "0",
      totalRelayFees: withdrawalStats?.totalRelayFees || "0",
      ragequitCount: Number(ragequitStats?.ragequitCount || 0),
      totalRagequitAmount: ragequitStats?.totalRagequitAmount || "0",
      crosschainDepositsByChain: {},
      crosschainWithdrawalsByChain: {},
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { success: true, data },
      {
        headers: {
          "Cache-Control": `s-maxage=${CACHE_TTL.poolStats}, stale-while-revalidate`,
        },
      }
    );
  } catch (error) {
    console.error("[API] pool-stats error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to fetch pool stats" },
      { status: 500 }
    );
  }
}
