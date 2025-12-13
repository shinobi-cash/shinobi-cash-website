import type { Activity } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusIndicator } from "./ActivityStatusIndicator";
interface ActivityRowProps {
  activity: Activity;
}

export const ActivityRow = ({ activity }: ActivityRowProps) => {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";
  const displayType = activity.type === "CROSSCHAIN_DEPOSIT" ? "cross-chain deposit" : activity.type.toLowerCase();

  return (
    <div className="bg-app-surface border-b border-app px-2 py-2 active:bg-app-surface-hover transition-all duration-150 cursor-pointer hover:bg-app-surface-hover">
      <div className="flex items-center justify-between gap-2">
        {/* Left side: Type and amount */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-app-primary tracking-tight capitalize text-base sm:text-lg truncate">
            {displayType}
          </div>
          <div
            className={`text-xs sm:text-sm font-medium tabular-nums flex items-center gap-1 ${
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
            <div className="text-xs sm:text-sm text-app-tertiary font-medium whitespace-nowrap">
              {formatTimestamp(activity.timestamp)}
            </div>
          </div>
          <ActivityStatusIndicator type={activity.type} status={activity.aspStatus} />
        </div>
      </div>
    </div>
  );
};
