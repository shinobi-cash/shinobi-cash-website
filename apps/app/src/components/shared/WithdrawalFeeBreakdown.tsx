/**
 * Withdrawal Fee Breakdown Component
 * Collapsible section showing withdrawal fees and final amount received
 */

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
  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="py-3 cursor-pointer hover:bg-gray-800/80 transition-colors flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">Fees</span>
          <svg className="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Withdrawal Amount</span>
            <span className="text-white">{withdrawalAmount.toFixed(4)} {assetSymbol}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">Execution Fee</span>
              <span className="text-xs text-gray-500">Network gas</span>
            </div>
            <span className="text-orange-400">-{executionFee.toFixed(4)} {assetSymbol}</span>
          </div>
          {isCrossChain && solverFee !== undefined && solverFee > 0 && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400">Solver Fee</span>
                <span className="text-xs text-gray-500">Cross-chain</span>
              </div>
              <span className="text-orange-400">-{solverFee.toFixed(4)} {assetSymbol}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">You Receive</span>
              <span className="text-white font-bold">{youReceive.toFixed(4)} {assetSymbol}</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
