/**
 * Withdrawal Fee Breakdown Component
 * Collapsible section showing withdrawal fees and final amount received with USD values
 */

import { usePriceData } from "@/hooks/usePriceData";
import { formatUsdAmount } from "@/utils/formatters";
import type { TokenSymbol } from "@/lib/prices/types";

interface WithdrawalFeeBreakdownProps {
  withdrawalAmount: number;
  executionFee: number;
  solverFee?: number;
  youReceive: number;
  assetSymbol: string;
  isCrossChain?: boolean;
}

export function WithdrawalFeeBreakdown({
  withdrawalAmount,
  executionFee,
  solverFee,
  youReceive,
  assetSymbol,
  isCrossChain = false,
}: WithdrawalFeeBreakdownProps) {
  // Fetch current price
  const { usdPrice } = usePriceData(assetSymbol as TokenSymbol);

  // Calculate USD values
  const withdrawalUsd = usdPrice ? withdrawalAmount * usdPrice : null;
  const executionFeeUsd = usdPrice ? executionFee * usdPrice : null;
  const solverFeeUsd = usdPrice && solverFee ? solverFee * usdPrice : null;
  const youReceiveUsd = usdPrice ? youReceive * usdPrice : null;

  // Calculate total fees USD
  const totalFeesUsd = executionFeeUsd !== null && (solverFeeUsd !== null || !isCrossChain)
    ? executionFeeUsd + (solverFeeUsd || 0)
    : null;

  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="flex cursor-pointer items-center justify-between py-3 transition-colors hover:bg-gray-800/80">
          <span className="text-sm font-medium text-gray-400">Fees</span>
          <div className="flex items-center gap-2">
            {totalFeesUsd !== null && (
              <span className="text-sm text-gray-400">≈ {formatUsdAmount(totalFeesUsd, 4)}</span>
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
            <span className="text-gray-400">Withdrawal Amount</span>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-white">
                {withdrawalAmount.toFixed(4)} {assetSymbol}
              </span>
              {withdrawalUsd !== null && (
                <span className="text-xs text-gray-500">≈ {formatUsdAmount(withdrawalUsd)}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">Execution Fee</span>
              <span className="text-xs text-gray-500">Network gas</span>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <span className="text-orange-400">
                -{executionFee.toFixed(4)} {assetSymbol}
              </span>
              {executionFeeUsd !== null && (
                <span className="text-xs text-gray-500">≈ {formatUsdAmount(executionFeeUsd)}</span>
              )}
            </div>
          </div>
          {isCrossChain && solverFee !== undefined && solverFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400">Solver Fee</span>
                <span className="text-xs text-gray-500">Cross-chain</span>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="text-orange-400">
                  -{solverFee.toFixed(4)} {assetSymbol}
                </span>
                {solverFeeUsd !== null && (
                  <span className="text-xs text-gray-500">≈ {formatUsdAmount(solverFeeUsd)}</span>
                )}
              </div>
            </div>
          )}
          <div className="mt-2 border-t border-gray-700 pt-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-white">You Receive</span>
              <div className="flex flex-col items-end gap-0.5">
                <span className="font-bold text-white">
                  {youReceive.toFixed(4)} {assetSymbol}
                </span>
                {youReceiveUsd !== null && (
                  <span className="text-xs text-gray-500">≈ {formatUsdAmount(youReceiveUsd)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
