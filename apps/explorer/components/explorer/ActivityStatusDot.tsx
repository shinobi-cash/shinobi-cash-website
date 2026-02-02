import type { ActivityType } from "@/services/data/indexerService";

interface Props {
  type: ActivityType | string;
  status?: string | null;
}

export function ActivityStatusDot({ type, status }: Props) {
  // withdrawals always final (include Withdraw2 types)
  if (
    type === "WITHDRAWAL" ||
    type === "WITHDRAW2" ||
    type === "RAGEQUIT" ||
    type === "CROSSCHAIN_WITHDRAWAL" ||
    type === "CROSSCHAIN_WITHDRAW2"
  ) {
    return <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />;
  }

  const color =
    status === "approved"
      ? "bg-emerald-500"
      : status === "rejected"
        ? "bg-rose-500"
        : status === "pending"
          ? "bg-amber-400"
          : "bg-neutral-500";

  return <span className={`h-2.5 w-2.5 rounded-full ${color}`} />;
}
