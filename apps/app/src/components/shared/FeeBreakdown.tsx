/**
 * Fee Breakdown Component
 * Unified component for showing execution fee and optional solver fee
 * Supports both deposits (with estimation) and withdrawals (with deduction display)
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/types/price";
import { ChevronDown } from "lucide-react";

interface FeeBreakdownProps {
  /** Execution fee - accepts string (for estimates) or number (for exact values) */
  executionFee: string | number;
  /** Asset symbol for pricing */
  assetSymbol: string;
  /** Optional solver fee for cross-chain operations */
  solverFee?: number;
  /** Whether this is a cross-chain operation */
  isCrossChain?: boolean;
  /** Show estimating state (for deposits) */
  isEstimating?: boolean;
  /** Show as deduction with minus sign (for withdrawals) */
  showAsDeduction?: boolean;
  /** Number of decimals to display */
  decimals?: number;
}

export function FeeBreakdown({
  executionFee,
  assetSymbol,
  solverFee,
  isCrossChain = false,
  isEstimating = false,
  showAsDeduction = false,
  decimals = 4,
}: FeeBreakdownProps) {
  // Fetch current price
  const { usdPrice } = usePriceData(assetSymbol as TokenSymbol);

  // Convert execution fee to number
  const executionFeeNumber =
    typeof executionFee === "string" ? Number.parseFloat(executionFee) : executionFee;

  // Calculate USD values
  const executionFeeUsd =
    usdPrice && !Number.isNaN(executionFeeNumber) ? executionFeeNumber * usdPrice : null;
  const solverFeeUsd = usdPrice && solverFee ? solverFee * usdPrice : null;

  // Calculate total fees USD
  const totalFeesUsd =
    executionFeeUsd !== null && (solverFeeUsd !== null || !isCrossChain)
      ? executionFeeUsd + (solverFeeUsd || 0)
      : null;

  // Prefix for amounts
  const prefix = showAsDeduction ? "-" : "~";

  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between py-3 transition-colors">
          <span className="text-muted-foreground text-sm font-medium">Fees</span>
          <div className="flex items-center gap-2">
            {!isEstimating && totalFeesUsd !== null && (
              <span className="text-muted-foreground text-sm">
                ≈ {formatUsdAmount(totalFeesUsd, 4)}
              </span>
            )}
            <ChevronDown className="hover:bg-muted/80 h-4 w-4" />
          </div>
        </summary>
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Execution Fee</span>
              <span className="text-muted-foreground text-xs">Network gas</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-orange-400">
                {isEstimating
                  ? "Estimating..."
                  : `${prefix}${executionFeeNumber.toFixed(decimals)} ${assetSymbol}`}
              </span>
              {!isEstimating && executionFeeUsd !== null && (
                <span className="text-muted-foreground text-xs">
                  ≈ {formatUsdAmount(executionFeeUsd, 4)}
                </span>
              )}
            </div>
          </div>
          {isCrossChain && solverFee !== undefined && solverFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Solver Fee</span>
                <span className="text-muted-foreground text-xs">Cross-chain</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-orange-400">
                  {prefix}
                  {solverFee.toFixed(decimals)} {assetSymbol}
                </span>
                {solverFeeUsd !== null && (
                  <span className="text-muted-foreground text-xs">
                    ≈ {formatUsdAmount(solverFeeUsd)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
