import type { Activity, ASPStatus } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusDot } from "./ActivityStatusDot";

interface Props {
  activity: Activity;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdraw",
  WITHDRAW2: "Withdraw (merge)",
  CROSSCHAIN_DEPOSIT: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAWAL: "Cross-chain Withdraw",
  CROSSCHAIN_WITHDRAW2: "Cross-chain Withdraw (merge)",
  CROSSCHAIN_DEPOSIT_PENDING: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAWAL_PENDING: "Cross-chain Withdraw",
  CROSSCHAIN_WITHDRAW2_PENDING: "Cross-chain Withdraw (merge)",
  RAGEQUIT: "Ragequit",
};

const ASP_STATUS_COLORS: Record<ASPStatus, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
  rejected: "bg-rose-500/20 text-rose-400",
};

export function ActivityRow({ activity }: Props) {
  const isDeposit =
    activity.type === "DEPOSIT" ||
    activity.type === "CROSSCHAIN_DEPOSIT" ||
    activity.type === "CROSSCHAIN_DEPOSIT_PENDING";

  const label = ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type;
  const statusColors = ASP_STATUS_COLORS[activity.aspStatus] ?? ASP_STATUS_COLORS.pending;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityStatusDot type={activity.type} status={activity.aspStatus} />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors}`}>
          {activity.aspStatus}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span
          className={`font-medium tabular-nums ${
            isDeposit ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {isDeposit ? "+" : "−"}
          {formatEthAmount(activity.amount, { decimals: 6 })} ETH
        </span>
        <span className="text-neutral-400">
          {formatTimestamp(activity.timestamp)}
        </span>
      </div>
    </div>
  );
}
