/**
 * Activity Row Component
 *
 * Displays a single activity entry in the activity list.
 * Aligned with explorer design - simple row with status dot.
 */

import type { ActivityEntry } from "@/types/activity";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { formatTimestamp } from "@/utils/formatters";

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
  const { note, displayAmount, type } = entry;
  const isDeposit = type === "deposit";
  // Dot color based on ASP status only
  const dotColor =
    note.aspStatus === "approved" ? "bg-emerald-500" :
    note.aspStatus === "rejected" ? "bg-rose-500" :
    note.aspStatus === "pending" ? "bg-amber-400" :
    "bg-neutral-500";
  const label = getActivityLabel(entry);

  return (
    <button
      type="button"
      className="hover:bg-white/[0.04] w-full cursor-pointer px-4 py-3 text-left transition-colors"
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
            {formatTimestamp(note.timestamp)}
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
