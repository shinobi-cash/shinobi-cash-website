/**
 * Fee Breakdown Component
 * Shows network gas cost with USD value
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/lib/prices/types";

interface FeeBreakdownProps {
  gasCost: string;
  assetSymbol: string;
  isEstimatingGas?: boolean;
}

export function FeeBreakdown({ gasCost, assetSymbol, isEstimatingGas = false }: FeeBreakdownProps) {
  // Fetch current price
  const { usdPrice } = usePriceData(assetSymbol as TokenSymbol);

  // Calculate USD value
  const gasCostAsNumber = Number.parseFloat(gasCost);
  const usdValue = usdPrice && !Number.isNaN(gasCostAsNumber) ? gasCostAsNumber * usdPrice : null;

  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-gray-800/80">
          <span className="text-sm font-medium text-gray-400">Network Fee</span>
          <div className="flex items-center gap-2">
            {!isEstimatingGas && usdValue !== null && (
              <span className="text-sm text-gray-400">≈ {formatUsdAmount(usdValue, 4)}</span>
            )}
            <svg
              className="h-4 w-4 text-gray-400 transition-transform duration-200"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </summary>
        <div className="space-y-2 px-4 pb-4 pt-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">Estimated Gas</span>
              <span className="text-xs text-gray-500">Transaction fee</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-gray-300">
                {isEstimatingGas ? "Estimating..." : `~${Number(gasCost).toFixed(6)} ${assetSymbol}`}
              </span>
              {!isEstimatingGas && usdValue !== null && (
                <span className="text-xs text-gray-500">≈ {formatUsdAmount(usdValue, 4)}</span>
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
