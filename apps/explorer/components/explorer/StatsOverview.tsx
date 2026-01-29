"use client";

import { useEffect, useState } from "react";
import { fetchPoolStats, type PoolStats } from "@/services/data/indexerService";
import { formatEthAmount } from "@/utils/formatters";
// import { getChainName } from "@/config/chains"; // For crosschain stats charts
import { StatsCard } from "./StatsCard";

export function StatsOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<PoolStats | null>(null);

  useEffect(() => {
    fetchPoolStats()
      .then((data) => {
        if (data) {
          setStats(data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const totalValue =
    stats?.totalDeposits && stats?.totalWithdrawals
      ? BigInt(stats.totalDeposits) - BigInt(stats.totalWithdrawals)
      : BigInt(0);

  // For crosschain stats charts
  // const totalCrosschainDeposits = stats?.crosschainDepositsByChain
  //   ? Object.values(stats.crosschainDepositsByChain).reduce((sum, s) => sum + s.count, 0)
  //   : 0;
  // const totalCrosschainWithdrawals = stats?.crosschainWithdrawalsByChain
  //   ? Object.values(stats.crosschainWithdrawalsByChain).reduce((sum, s) => sum + s.count, 0)
  //   : 0;

  return (
    <section className="space-y-4">
      {/* Primary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCard
          label="Total Pool Value"
          value={loading ? "—" : `${formatEthAmount(totalValue, { decimals: 4 })} ETH`}
          gradient="from-emerald-500/20 to-cyan-500/10"
        />

        <StatsCard
          label="Unique Depositors"
          value={loading ? "—" : (stats?.uniqueDepositors.toString() ?? "0")}
          gradient="from-blue-500/20 to-indigo-500/10"
        />

        <StatsCard
          label="Ragequits"
          value={loading ? "—" : (stats?.ragequitCount.toString() ?? "0")}
          gradient="from-orange-500/20 to-red-500/10"
        />
      </div>

      {/* Activity Counts */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatsCard
          label="Total Deposits"
          value={loading ? "—" : (stats?.depositCount.toString() ?? "0")}
          gradient="from-violet-500/20 to-fuchsia-500/10"
        />

        <StatsCard
          label="Total Withdrawals"
          value={loading ? "—" : (stats?.withdrawalCount.toString() ?? "0")}
          gradient="from-pink-500/20 to-rose-500/10"
        />
      </div>

      {/* TODO: Crosschain Stats - Display with graphs/charts showing deposits by origin chain and withdrawals by destination chain
      {!loading && (totalCrosschainDeposits > 0 || totalCrosschainWithdrawals > 0) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h3 className="mb-4 text-sm font-medium text-neutral-300">Crosschain Activity</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs text-neutral-400">Deposits by Origin Chain</p>
              <div className="space-y-2">
                {stats?.crosschainDepositsByChain &&
                Object.keys(stats.crosschainDepositsByChain).length > 0 ? (
                  Object.entries(stats.crosschainDepositsByChain).map(([chainId, chainStats]) => (
                    <div
                      key={chainId}
                      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                    >
                      <span className="text-sm text-neutral-300">{getChainName(chainId)}</span>
                      <span className="text-sm font-medium text-white">{chainStats.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-neutral-500">No crosschain deposits yet</p>
                )}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs text-neutral-400">Withdrawals by Destination Chain</p>
              <div className="space-y-2">
                {stats?.crosschainWithdrawalsByChain &&
                Object.keys(stats.crosschainWithdrawalsByChain).length > 0 ? (
                  Object.entries(stats.crosschainWithdrawalsByChain).map(
                    ([chainId, chainStats]) => (
                      <div
                        key={chainId}
                        className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
                      >
                        <span className="text-sm text-neutral-300">{getChainName(chainId)}</span>
                        <span className="text-sm font-medium text-white">{chainStats.count}</span>
                      </div>
                    )
                  )
                ) : (
                  <p className="text-sm text-neutral-500">No crosschain withdrawals yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      */}
    </section>
  );
}
