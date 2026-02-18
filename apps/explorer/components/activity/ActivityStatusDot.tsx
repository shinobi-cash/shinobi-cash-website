import type { ActivityType, ASPStatus } from "@shinobi-cash/data";

interface Props {
  type: ActivityType | string;
  status?: ASPStatus | string | null;
}

const STATUS_COLORS: Record<string, { dot: string; ring: string }> = {
  approved: { dot: "bg-emerald-500", ring: "ring-emerald-500/30" },
  pending: { dot: "bg-amber-400", ring: "ring-amber-400/30" },
};

export function ActivityStatusDot({ type, status }: Props) {
  // Withdrawals are always final (include Withdraw2 types)
  const isFinalWithdrawal =
    type === "WITHDRAW" ||
    type === "WITHDRAW_2" ||
    type === "RAGEQUIT" ||
    type === "CROSSCHAIN_WITHDRAWAL_FILL";

  const colors = isFinalWithdrawal
    ? STATUS_COLORS.approved
    : (STATUS_COLORS[status ?? "pending"] ?? STATUS_COLORS.pending);

  return <div className={`h-2 w-2 rounded-full ${colors.dot} ring-2 ${colors.ring}`} />;
}
