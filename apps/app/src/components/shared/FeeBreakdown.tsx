/**
 * Fee Breakdown Component
 * Shows network gas cost
 */

interface FeeBreakdownProps {
  gasCost: string;
  assetSymbol: string;
  isEstimatingGas?: boolean;
}

export function FeeBreakdown({
  gasCost,
  assetSymbol,
  isEstimatingGas = false,
}: FeeBreakdownProps) {
  return (
    <div className="mb-2">
      <details className="overflow-hidden">
        <summary className="py-3 cursor-pointer hover:bg-gray-800/80 transition-colors flex items-center justify-between">
          <span className="text-sm font-medium text-gray-400">Network Fee</span>
          <svg className="w-4 h-4 text-gray-400 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        <div className="px-4 pb-4 pt-2 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <div className="flex flex-col">
              <span className="text-gray-400">Estimated Gas</span>
              <span className="text-xs text-gray-500">Transaction fee</span>
            </div>
            <span className="text-gray-300">
              {isEstimatingGas ? (
                "Estimating..."
              ) : (
                `~${Number(gasCost).toFixed(6)} ${assetSymbol}`
              )}
            </span>
          </div>
        </div>
      </details>
    </div>
  );
}
