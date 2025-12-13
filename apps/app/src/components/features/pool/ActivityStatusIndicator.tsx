import type { ActivityStatus, ActivityType } from "@/services/data/indexerService";

interface ActivityStatusIndicatorProps {
  type: ActivityType | string;
  status: ActivityStatus | string;
}

export const ActivityStatusIndicator = ({ type, status }: ActivityStatusIndicatorProps) => {
  // Withdrawals and ragequits are always auto-approved (green)
  if (type === "WITHDRAWAL" || type === "RAGEQUIT" || type === "CROSSCHAIN_WITHDRAWAL") {
    return <div className="w-3 h-3 rounded-full bg-status-success" />;
  }

  // Deposits (same-chain and cross-chain) have different statuses
  if (type === "DEPOSIT" || type === "CROSSCHAIN_DEPOSIT") {
    const colorMap = {
      approved: "bg-status-success",
      pending: "bg-status-warning",
      rejected: "bg-status-error",
    } as const;

    const color = colorMap[status as keyof typeof colorMap] || "bg-status-neutral";
    return <div className={`w-3 h-3 rounded-full ${color}`} />;
  }

  return <div className="w-3 h-3 rounded-full bg-status-neutral" />;
};
