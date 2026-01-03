/**
 * Activity Row Component
 *
 * Displays a single activity in the activity list.
 */

import type { Activity } from "../../types";
import { ActivityTypeBadge } from "./ActivityTypeBadge";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { formatTimestamp } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { ArrowRight } from "lucide-react";

interface ActivityRowProps {
  activity: Activity;
  onClick?: () => void;
}

export function ActivityRow({ activity, onClick }: ActivityRowProps) {
  const isCrossChain = activity.isCrossChain;
  const originChainName = getChainName(activity.originChainId);
  const destChainName = getChainName(activity.destinationChainId);

  return (
    <button
      type="button"
      className="w-full cursor-pointer rounded-lg border border-gray-700 bg-gray-800/50 px-3 py-3 text-left transition-all duration-150 hover:bg-gray-800/70"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <div className="flex flex-col gap-2">
        {/* Top row: Type badge and amount */}
        <div className="flex items-start justify-between gap-2">
          <ActivityTypeBadge type={activity.type} />
          <div className="text-right">
            <AmountDisplay
              amount={activity.amount}
              layout="inline"
              ethOptions={{ maxDecimals: 6 }}
              className="gap-1.5"
              ethClassName="text-white font-semibold text-base"
              usdClassName="text-gray-400 text-xs"
            />
          </div>
        </div>

        {/* Bottom row: Chain info, status, timestamp */}
        <div className="flex items-center justify-between gap-2 text-xs">
          {/* Chain info */}
          <div className="flex items-center gap-1.5 text-gray-400">
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

          {/* Status and timestamp */}
          <div className="flex items-center gap-2">
            {!activity.isActivated && (
              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                Pending
              </span>
            )}
            <span className="text-gray-400">{formatTimestamp(activity.timestamp)}</span>
          </div>
        </div>
      </div>
    </button>
  );
}
