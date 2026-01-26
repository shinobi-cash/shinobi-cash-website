/**
 * PriceDisplay Component
 * Displays exchange rate: "1 ETH = $2,897.75"
 */

import { formatUsdAmount } from "@/utils/formatters";

interface PriceDisplayProps {
  symbol: string;
  priceUsd: number | null;
}

export function PriceDisplay({ symbol, priceUsd }: PriceDisplayProps) {
  if (priceUsd === null) return null;

  return (
    <span className="text-sm text-neutral-400">
      1 {symbol} = {formatUsdAmount(priceUsd)}
    </span>
  );
}
