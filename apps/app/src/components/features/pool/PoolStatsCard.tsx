/**
 * Pool Statistics Card
 * Displays pool overview stats like total deposits and member count
 */

import { formatEthAmount } from "@/utils/formatters";

interface PoolStatsCardProps {
  totalDeposits: bigint;
  depositCount: number;
  loading?: boolean;
}

export function PoolStatsCard({
  totalDeposits,
  depositCount,
  loading = false,
}: PoolStatsCardProps) {
  return (
    <div className="bg-app-surface border-app rounded-xl border p-2 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <p className="text-app-primary text-2xl font-bold tabular-nums">
            {loading ? "..." : `${formatEthAmount(totalDeposits, { decimals: 4 })} ETH`}
          </p>
          <p className="text-app-secondary text-sm">Total Pool Value</p>
        </div>
        <div className="flex flex-col text-right">
          <p className="text-app-primary text-2xl font-bold tabular-nums">
            {loading ? "..." : depositCount}
          </p>
          <p className="text-app-secondary text-sm">Total Deposits</p>
        </div>
      </div>
    </div>
  );
}
