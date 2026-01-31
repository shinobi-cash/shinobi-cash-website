import { ArrowDown, Globe, Loader2 } from "lucide-react";

interface SectionDividerProps {
  /** Network/gas fee amount (e.g., "~$0.02") */
  networkFee?: string;
  /** Solver fee amount for cross-chain (e.g., "~$1.50") */
  solverFee?: string;
  /** Show cross-chain route indicator */
  isCrossChain?: boolean;
  /** Show loading spinner instead of arrow */
  isLoading?: boolean;
}

/**
 * Section Divider Component
 * Displays fee pills on left, arrow/loader in center, route badge on right (if cross-chain)
 */
export function SectionDivider({
  networkFee,
  solverFee,
  isCrossChain,
  isLoading,
}: SectionDividerProps) {
  return (
    <div className="flex items-center justify-between py-1">
      {/* Left - Fee pills */}
      <div className="flex flex-1 flex-wrap items-center gap-1 sm:gap-2">
        {networkFee && (
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 sm:px-2 sm:py-1">
            <span className="text-xs text-neutral-500">Gas</span>
            <span className="text-xs text-neutral-300">{networkFee}</span>
          </div>
        )}
        {solverFee && (
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 sm:px-2 sm:py-1">
            <span className="text-xs text-neutral-500">Solver</span>
            <span className="text-xs text-neutral-300">{solverFee}</span>
          </div>
        )}
      </div>

      {/* Center - Arrow or Loader */}
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-neutral-900 sm:h-8 sm:w-8">
        {isLoading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400 sm:h-4 sm:w-4" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-neutral-400 sm:h-4 sm:w-4" />
        )}
      </div>

      {/* Right - Route badge */}
      <div className="flex flex-1 justify-end">
        {isCrossChain && (
          <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-1.5 py-0.5 sm:px-2 sm:py-1">
            <Globe className="h-3 w-3 text-neutral-400" />
            <span className="text-xs text-neutral-300">Cross-chain</span>
          </div>
        )}
      </div>
    </div>
  );
}
