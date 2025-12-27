/**
 * USD Value Display Component
 * Shows USD equivalent of entered token amount
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/lib/prices/types";

interface UsdValueDisplayProps {
  /** Amount in token (e.g., "0.5" for 0.5 ETH) */
  amount: string;
  /** Token symbol */
  symbol: TokenSymbol;
  /** Custom className */
  className?: string;
}

export function UsdValueDisplay({ amount, symbol, className = "" }: UsdValueDisplayProps) {
  const { usdPrice, isLoading } = usePriceData(symbol);

  // Parse amount
  const amountAsNumber = Number.parseFloat(amount);

  // Don't show anything if amount is invalid or zero
  if (!amount || Number.isNaN(amountAsNumber) || amountAsNumber === 0) {
    return null;
  }

  // Calculate USD value
  const usdValue = usdPrice && !Number.isNaN(amountAsNumber) ? amountAsNumber * usdPrice : null;

  // Don't show if price not available
  if (!usdValue && !isLoading) {
    return null;
  }

  return (
    <div className={`text-sm text-gray-400 ${className}`}>
      {isLoading ? "Loading price..." : `≈ ${formatUsdAmount(usdValue!)}`}
    </div>
  );
}
