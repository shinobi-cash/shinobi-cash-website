"use client";

import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";

// Available pools - add more as they become available
const POOLS = [{ id: SHINOBI_CASH_ETH_POOL.address, label: "ETH Pool" }] as const;

interface Props {
  poolId: string;
  onPoolChange: (poolId: string) => void;
}

export function ActivityFilters({ poolId, onPoolChange }: Props) {
  // Don't show filter if only one pool
  if (POOLS.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      <select
        value={poolId}
        onChange={(e) => onPoolChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-white/20 focus:outline-none"
      >
        {POOLS.map((pool) => (
          <option key={pool.id} value={pool.id} className="bg-neutral-900">
            {pool.label}
          </option>
        ))}
      </select>
    </div>
  );
}
