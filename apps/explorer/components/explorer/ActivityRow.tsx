import type { Activity } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusDot } from "./ActivityStatusDot";

interface Props {
  activity: Activity;
}

export function ActivityRow({ activity }: Props) {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";

  const label =
    activity.type === "CROSSCHAIN_DEPOSIT" ? "Cross-chain deposit" : activity.type.toLowerCase();

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      {/* Left */}
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <ActivityStatusDot type={activity.type} status={activity.aspStatus} />
          <span className="truncate text-sm font-medium capitalize text-white">{label}</span>
        </div>

        <div className="mt-0.5 text-xs text-neutral-400">{formatTimestamp(activity.timestamp)}</div>
      </div>

      {/* Right */}
      <div
        className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
          isDeposit ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {isDeposit ? "+" : "−"}
        {formatEthAmount(activity.amount, { maxDecimals: 6 })} ETH
      </div>
    </div>
  );
}
