import type { ActivityStatus, ActivityType } from "@/services/data/indexerService";

interface ActivityStatusIndicatorProps {
  type: ActivityType | string;
  status: ActivityStatus | string;
}

export const ActivityStatusIndicator = ({ type, status }: ActivityStatusIndicatorProps) => {
  // Withdrawals and ragequits are always auto-approved (green)
  if (type === "WITHDRAWAL" || type === "RAGEQUIT" || type === "CROSSCHAIN_WITHDRAWAL") {
    return <div className="bg-status-success h-3 w-3 rounded-full" />;
  }

  // Deposits (same-chain and cross-chain) have different statuses
  if (type === "DEPOSIT" || type === "CROSSCHAIN_DEPOSIT") {
    const colorMap = {
      approved: "bg-status-success",
      pending: "bg-status-warning",
      rejected: "bg-status-error",
    } as const;

    const color = colorMap[status as keyof typeof colorMap] || "bg-status-neutral";
    return <div className={`h-3 w-3 rounded-full ${color}`} />;
  }

  return <div className="bg-status-neutral h-3 w-3 rounded-full" />;
};
