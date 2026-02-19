/**
 * Activity Type Badge Component
 *
 * Visual indicator for activity type with color coding.
 * Supports all ActivityType variants from @shinobi-cash/data.
 */

import type { ActivityType } from "@shinobi-cash/data";

interface ActivityTypeBadgeProps {
  type: ActivityType;
  size?: "sm" | "md";
}

const TYPE_STYLES: Record<ActivityType, { bg: string; text: string; dot: string }> = {
  // Deposits
  DEPOSIT: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  CROSSCHAIN_DEPOSIT_FILL: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  CROSSCHAIN_DEPOSIT_INTENT: {
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  CROSSCHAIN_DEPOSIT_REFUND: {
    bg: "bg-orange-400/10",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  // Withdrawals
  WITHDRAW: {
    bg: "bg-rose-400/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  WITHDRAW_2: {
    bg: "bg-rose-400/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  CROSSCHAIN_WITHDRAW_INTENT: {
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  CROSSCHAIN_WITHDRAW_2_INTENT: {
    bg: "bg-amber-400/10",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  CROSSCHAIN_WITHDRAWAL_FILL: {
    bg: "bg-rose-400/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
  },
  CROSSCHAIN_WITHDRAWAL_REFUND: {
    bg: "bg-orange-400/10",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  // Ragequit
  RAGEQUIT: {
    bg: "bg-red-500/10",
    text: "text-red-500",
    dot: "bg-red-500",
  },
};

const TYPE_LABELS: Record<ActivityType, string> = {
  DEPOSIT: "Deposit",
  CROSSCHAIN_DEPOSIT_FILL: "Crosschain Deposit",
  CROSSCHAIN_DEPOSIT_INTENT: "Crosschain Deposit",
  CROSSCHAIN_DEPOSIT_REFUND: "Deposit Refunded",
  WITHDRAW: "Withdrawal",
  WITHDRAW_2: "Withdraw2",
  CROSSCHAIN_WITHDRAW_INTENT: "Crosschain Withdraw",
  CROSSCHAIN_WITHDRAW_2_INTENT: "Crosschain Withdraw2",
  CROSSCHAIN_WITHDRAWAL_FILL: "Crosschain Withdrawal",
  CROSSCHAIN_WITHDRAWAL_REFUND: "Withdrawal Refunded",
  RAGEQUIT: "Ragequit",
};

export function ActivityTypeBadge({ type, size = "sm" }: ActivityTypeBadgeProps) {
  const styles = TYPE_STYLES[type];
  const label = TYPE_LABELS[type];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${styles.bg} ${styles.text} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {label}
    </span>
  );
}
