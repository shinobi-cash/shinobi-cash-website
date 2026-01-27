/**
 * Activity Type Badge Component
 *
 * Visual indicator for activity type with color coding.
 */

import type { ActivityType } from "@/types/activity";
import { ACTIVITY_TYPE_LABELS } from "@/types/activity";

interface ActivityTypeBadgeProps {
  type: ActivityType;
  size?: "sm" | "md";
}

const TYPE_STYLES: Record<ActivityType, { bg: string; text: string; dot: string; icon: string }> = {
  deposit: {
    bg: "bg-emerald-400/10",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
    icon: "🟢",
  },
  withdrawal: {
    bg: "bg-rose-400/10",
    text: "text-rose-400",
    dot: "bg-rose-400",
    icon: "🔵",
  },
  refund: {
    bg: "bg-yellow-400/10",
    text: "text-yellow-400",
    dot: "bg-yellow-400",
    icon: "🟡",
  },
};

export function ActivityTypeBadge({ type, size = "sm" }: ActivityTypeBadgeProps) {
  const styles = TYPE_STYLES[type];
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${styles.bg} ${styles.text} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {ACTIVITY_TYPE_LABELS[type]}
    </span>
  );
}
