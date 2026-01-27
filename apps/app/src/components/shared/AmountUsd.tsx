/**
 * AmountUsd Component
 * Displays USD amount: "$289.31"
 */

import { formatUsdAmount } from "@/utils/formatters";

interface AmountUsdProps {
  amountUsd: number | null;
}

export function AmountUsd({ amountUsd }: AmountUsdProps) {
  if (amountUsd === null) return null;

  return <span className="text-sm text-neutral-400">{formatUsdAmount(amountUsd)}</span>;
}
