import type { Activity } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusIndicator } from "./ActivityStatusIndicator";
interface ActivityRowProps {
  activity: Activity;
}

export const ActivityRow = ({ activity }: ActivityRowProps) => {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";
  const displayType =
    activity.type === "CROSSCHAIN_DEPOSIT" ? "cross-chain deposit" : activity.type.toLowerCase();

  return (
    <div className="bg-app-surface border-app active:bg-app-surface-hover hover:bg-app-surface-hover cursor-pointer border-b px-2 py-2 transition-all duration-150">
      <div className="flex items-center justify-between gap-2">
        {/* Left side: Type and amount */}
        <div className="min-w-0 flex-1">
          <div className="text-app-primary truncate text-base font-semibold capitalize tracking-tight sm:text-lg">
            {displayType}
          </div>
          <div
            className={`flex items-center gap-1 text-xs font-medium tabular-nums sm:text-sm ${
              isDeposit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
            }`}
          >
            <span className="font-bold">{isDeposit ? "+" : "−"}</span>
            <span>{`${formatEthAmount(activity.amount, { maxDecimals: 6 })} ETH`}</span>
          </div>
        </div>

        {/* Right side: Timestamp and status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="text-right">
            <div className="text-app-tertiary whitespace-nowrap text-xs font-medium sm:text-sm">
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
          <ActivityStatusIndicator type={activity.type} status={activity.aspStatus} />
        </div>
      </div>
    </div>
  );
};
