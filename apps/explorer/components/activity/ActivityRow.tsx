import type { ActivityItem, ASPStatus } from "@shinobi-cash/data";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusDot } from "./ActivityStatusDot";

interface Props {
  activity: ActivityItem;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdraw",
  WITHDRAW_2: "Withdraw (merge)",
  CROSSCHAIN_DEPOSIT_FILL: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAWAL_FILL: "Cross-chain Withdraw",
  CROSSCHAIN_DEPOSIT_INTENT: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAW_INTENT: "Cross-chain Withdraw",
  CROSSCHAIN_WITHDRAW_2_INTENT: "Cross-chain Withdraw (merge)",
  RAGEQUIT: "Ragequit",
};

const ASP_STATUS_COLORS: Record<ASPStatus | string, string> = {
  pending: "bg-amber-500/20 text-amber-400",
  approved: "bg-emerald-500/20 text-emerald-400",
};

export function ActivityRow({ activity }: Props) {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT_INTENT";

  const label = ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type;
  const aspStatus = "aspStatus" in activity ? activity.aspStatus : null;
  const statusColors = ASP_STATUS_COLORS[aspStatus ?? "pending"] ?? ASP_STATUS_COLORS.pending;

  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ActivityStatusDot type={activity.type} status={aspStatus} />
          <span className="text-sm font-medium text-white">{label}</span>
        </div>
        {aspStatus && (
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusColors}`}>
            {aspStatus}
          </span>
        )}
      </div>

      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span
          className={`font-medium tabular-nums ${isDeposit ? "text-emerald-400" : "text-rose-400"}`}
        >
          {isDeposit ? "+" : "−"}
          {formatEthAmount(activity.amount, { decimals: 6 })} ETH
        </span>
        <span className="text-neutral-400">{formatTimestamp(activity.timestamp)}</span>
      </div>
    </div>
  );
}
