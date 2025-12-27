/**
 * AmountDisplay Component
 * Self-contained component for displaying token amounts with optional USD value
 *
 * Features:
 * - Fetches and displays USD value automatically using usePriceData hook
 * - Graceful degradation (shows ETH only if price unavailable)
 * - Always displays ≈ symbol for USD to indicate estimate
 * - Customizable layout (inline, stacked, reversed)
 * - Customizable styling via className props
 *
 * USD VALUE SEMANTICS:
 * - USD values are informational estimates only
 * - Based on latest spot price (60s refresh)
 * - NOT used for transaction amounts
 * - ETH amounts remain source of truth
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatEthAmount, formatUsdAmount, type EthFormattingOptions } from "@/utils/formatters";
import type { TokenSymbol } from "@/lib/prices/types";

export interface AmountDisplayProps {
  /** Amount in ETH (can be wei string, ETH number, bigint) */
  amount: string | number | bigint | null | undefined;

  /** Token symbol (defaults to 'ETH') */
  symbol?: TokenSymbol;

  /** ETH formatting options */
  ethOptions?: EthFormattingOptions;

  /** Number of decimal places for USD (defaults to 2) */
  usdDecimals?: number;

  /** Show USD value (defaults to true) */
  showUsd?: boolean;

  /** Layout direction (defaults to 'inline') */
  layout?: "inline" | "stacked" | "reversed";

  /** Custom className for container */
  className?: string;

  /** Custom className for ETH amount */
  ethClassName?: string;

  /** Custom className for USD value */
  usdClassName?: string;

  /** Disable price fetching (useful for static displays) */
  disablePriceFetch?: boolean;
}

export function AmountDisplay({
  amount,
  symbol = "ETH",
  ethOptions,
  usdDecimals = 2,
  showUsd = true,
  layout = "inline",
  className = "",
  ethClassName = "",
  usdClassName = "",
  disablePriceFetch = false,
}: AmountDisplayProps) {
  // Fetch current price (React Query handles caching and deduplication)
  const { usdPrice } = usePriceData(symbol, {
    disableRefresh: disablePriceFetch,
  });

  // Format ETH amount
  const formattedEth = formatEthAmount(amount, ethOptions);

  // Calculate USD value
  const ethAsNumber = Number.parseFloat(formattedEth);
  const usdValue = usdPrice && !Number.isNaN(ethAsNumber) ? ethAsNumber * usdPrice : null;

  // Layout classes
  const layoutClasses = {
    inline: "flex items-center gap-2",
    stacked: "flex flex-col",
    reversed: "flex flex-col-reverse",
  };

  return (
    <div className={`${layoutClasses[layout]} ${className}`}>
      {/* ETH Amount (always shown) */}
      <span className={ethClassName}>
        {formattedEth} {symbol}
      </span>

      {/* USD Value (only if enabled and available) */}
      {showUsd && usdValue !== null && (
        <span className={usdClassName}>≈ {formatUsdAmount(usdValue, usdDecimals)}</span>
      )}
    </div>
  );
}
