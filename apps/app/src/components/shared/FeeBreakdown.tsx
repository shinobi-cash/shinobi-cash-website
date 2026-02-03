/**
 * Fee Breakdown Component
 * Unified component for showing execution fee and optional solver fee
 * Supports both deposits (with estimation) and withdrawals (with deduction display)
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/types/price";
import { ChevronDown } from "lucide-react";
import { LabelWithHover } from "./LabelWithHover";
import { FEE_CONFIG } from "@shinobi-cash/constants";

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

  // Format token amount (e.g., "~0.0001 ETH")
  const formatTokenAmount = (amount: number): string =>
    `${prefix}${amount.toFixed(decimals)} ${assetSymbol}`;

  // Render fee value: USD shown, ETH on hover (if USD available)
  const renderFeeValue = (feeAmount: number, feeUsd: number | null, estimating = false) => {
    if (estimating) return "Estimating...";
    const tokenText = formatTokenAmount(feeAmount);
    if (feeUsd !== null) {
      return (
        <LabelWithHover hoverText={tokenText} className="cursor-help">
          {prefix}
          {formatUsdAmount(feeUsd)}
        </LabelWithHover>
      );
    }
    return tokenText;
  };

  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between py-1 transition-colors">
          <span className="text-muted-foreground text-sm font-medium">Fees</span>
          <div className="flex items-center gap-2">
            {!isEstimating && totalFeesUsd !== null && (
              <span className="text-muted-foreground text-sm">
                {prefix}
                {formatUsdAmount(totalFeesUsd)}
              </span>
            )}
            <ChevronDown className="hover:bg-muted/80 h-4 w-4" />
          </div>
        </summary>
        <div className="space-y-1 pl-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Network Gas</span>
            <span className="text-orange-400">
              {renderFeeValue(executionFeeNumber, executionFeeUsd, isEstimating)}
            </span>
          </div>
          {isCrossChain && solverFee !== undefined && solverFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Solver Fee ({FEE_CONFIG.DEFAULT_SOLVER_FEE_BPS / 100}%)</span>
              <span className="text-orange-400">{renderFeeValue(solverFee, solverFeeUsd)}</span>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
