"use client";

import { useEffect, useState } from "react";
import { fetchPoolStats } from "@/services/data/indexerService";
import { formatEthAmount } from "@/utils/formatters";
import { StatsCard } from "./StatsCard";

export function StatsOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalDeposits: string;
    totalWithdrawals: string;
    depositCount: number;
  } | null>(null);

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

  return (
    <section className="grid gap-4 sm:grid-cols-2">
      <StatsCard
        label="Total Pool Value"
        value={loading ? "—" : `${formatEthAmount(totalValue, { decimals: 4 })} ETH`}
        gradient="from-emerald-500/20 to-cyan-500/10"
      />

      <StatsCard
        label="Total Deposits"
        value={loading ? "—" : (stats?.depositCount.toString() ?? "0")}
        gradient="from-violet-500/20 to-fuchsia-500/10"
      />
    </section>
  );
}
