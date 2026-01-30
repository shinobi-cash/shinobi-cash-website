/**
 * Activity Row Component
 *
 * Displays a single activity entry in the activity list.
 * Uses status fields directly for concise badge display.
 */

import type { ActivityEntry } from "@/types/activity";
import type { Note } from "@shinobi-cash/core";
import { ActivityTypeBadge } from "./ActivityTypeBadge";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { formatTimestamp } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { ArrowRight } from "lucide-react";

interface StatusBadge {
  label: string;
  className: string;
}

/**
 * Get status badge based on note state.
 * Only show badges for actionable/pending states - not "spent" since
 * activity is a transaction log (the type already indicates what happened).
 */
function getStatusBadge(note: Note): StatusBadge | null {
  // Cross-chain intent pending (waiting for solver)
  if (note.isCrossChain && note.intentStatus === "pending") {
    return { label: "Pending", className: "bg-yellow-400/10 text-yellow-400" };
  }

  // Cross-chain intent refunded
  if (note.isCrossChain && note.intentStatus === "refunded") {
    return { label: "Refunded", className: "bg-orange-400/10 text-orange-400" };
  }

  // ASP pending approval
  if (note.aspStatus === "pending") {
    return { label: "Pending", className: "bg-blue-400/10 text-blue-400" };
  }

  // ASP rejected
  if (note.aspStatus === "rejected") {
    return { label: "Rejected", className: "bg-red-400/10 text-red-400" };
  }

  // No badge for normal completed transactions
  return null;
}

interface ActivityRowProps {
  entry: ActivityEntry;
  onClick?: () => void;
}

export function ActivityRow({ entry, onClick }: ActivityRowProps) {
  const { note, isCrossChain, displayAmount, type } = entry;
  const originChainName = getChainName(note.originChainId);
  const destChainName = getChainName(note.destinationChainId);
  const statusBadge = getStatusBadge(note);

  return (
    <button
      type="button"
      className="border-white/10 bg-white/[0.02] hover:bg-white/[0.04] w-full cursor-pointer rounded-lg border px-3 py-3 text-left transition-all duration-150"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        {/* Top row: Type badge and amount */}
        <div className="flex items-start justify-between gap-2">
          <ActivityTypeBadge type={type} />
          <div className="text-right">
            <AmountDisplay
              amount={displayAmount}
              layout="inline"
              ethOptions={{ maxDecimals: 6 }}
              className="gap-1.5"
              ethClassName="text-white font-semibold text-base"
              usdClassName="text-neutral-500 text-xs"
            />
          </div>
        </div>

        {/* Bottom row: Chain info, status, timestamp */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="text-neutral-400 flex items-center gap-1.5">
            {isCrossChain ? (
              <>
                <span>{originChainName}</span>
                <ArrowRight className="h-3 w-3" />
                <span>{destChainName}</span>
              </>
            ) : (
              <span>{originChainName}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {statusBadge && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}>
                {statusBadge.label}
              </span>
            )}
            <span className="text-neutral-400">{formatTimestamp(note.timestamp)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
