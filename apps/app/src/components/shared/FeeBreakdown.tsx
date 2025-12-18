/**
 * Fee Breakdown Component
 * Collapsible section showing deposit fees and final amount
 */

interface FeeBreakdownProps {
  depositAmount: number;
  aspFee: number;
  solverFee?: number;
  totalNote: number;
  assetSymbol: string;
  isCrossChain?: boolean;
}

export function FeeBreakdown({
  depositAmount,
  aspFee,
  solverFee,
  totalNote,
  assetSymbol,
  isCrossChain = false,
}: FeeBreakdownProps) {
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
            <span className="text-gray-400">Deposit Amount</span>
            <span className="text-white">{depositAmount.toFixed(4)} {assetSymbol}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">ASP Fee (5%)</span>
              <span className="text-xs text-gray-500">Compliance</span>
            </div>
            <span className="text-orange-400">-{aspFee.toFixed(4)} {assetSymbol}</span>
          </div>
          {isCrossChain && solverFee !== undefined && (
            <div className="flex justify-between items-center text-sm">
              <div className="flex flex-col">
                <span className="text-gray-400">Solver Fee (5%)</span>
                <span className="text-xs text-gray-500">Cross-chain</span>
              </div>
              <span className="text-orange-400">-{solverFee.toFixed(4)} {assetSymbol}</span>
            </div>
          )}
          <div className="border-t border-gray-700 pt-2 mt-2">
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Deposit Note</span>
              <span className="text-white font-bold">{totalNote.toFixed(4)} {assetSymbol}</span>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
