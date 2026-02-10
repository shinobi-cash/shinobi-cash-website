/**
 * Activity Row Component
 *
 * Displays a single activity entry in the activity list.
 * Aligned with explorer design - simple row with status dot.
 */

import type { ActivityEntry } from "@/types/activity";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { formatTimestamp } from "@/utils/formatters";
import { getActivityStatusDotColor } from "@/utils/noteFiltering";

/**
 * Get display label for activity type.
 */
function getActivityLabel(entry: ActivityEntry): string {
  if (entry.isCrossChain && entry.type === "deposit") {
    return "Cross-chain deposit";
  }
  if (entry.isCrossChain && entry.type === "withdrawal") {
    return "Cross-chain withdrawal";
  }
  return entry.type.charAt(0).toUpperCase() + entry.type.slice(1);
}

interface ActivityRowProps {
  entry: ActivityEntry;
  onClick?: () => void;
}

export function ActivityRow({ entry, onClick }: ActivityRowProps) {
  const { activity, displayAmount, type, displayTimestamp } = entry;
  const isDeposit = type === "deposit";
  // Use activity-based status dot color function
  const dotColor = getActivityStatusDotColor(activity);
  const label = getActivityLabel(entry);

  return (
    <button
      type="button"
      className="w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-white/[0.04]"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: Status dot + Label + Timestamp */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
            <span className="truncate text-sm font-medium text-white">{label}</span>
          </div>
          <div className="mt-0.5 pl-[18px] text-xs text-neutral-400">
            {formatTimestamp(displayTimestamp)}
          </div>
        </div>

        {/* Right: Amount with +/- and USD */}
        <div className="shrink-0 text-right">
          <AmountDisplay
            amount={displayAmount}
            layout="stacked"
            ethOptions={{ maxDecimals: 6 }}
            ethClassName={`text-sm font-semibold tabular-nums ${isDeposit ? "text-emerald-400" : "text-rose-400"}`}
            usdClassName="text-xs text-neutral-500"
            prefix={isDeposit ? "+" : "−"}
          />
        </div>
      </div>
    </button>
  );
}
