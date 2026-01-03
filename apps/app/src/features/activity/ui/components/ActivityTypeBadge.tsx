/**
 * Activity Type Badge Component
 *
 * Visual indicator for activity type with color coding.
 */

import type { ActivityType } from "../../types";
import { ACTIVITY_TYPE_LABELS } from "../../types";

interface ActivityTypeBadgeProps {
  type: ActivityType;
  size?: "sm" | "md";
}

const TYPE_STYLES: Record<ActivityType, { bg: string; text: string; dot: string; icon: string }> = {
  deposit: {
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-800 dark:text-green-400",
    dot: "bg-green-500",
    icon: "🟢",
  },
  withdrawal: {
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-800 dark:text-blue-400",
    dot: "bg-blue-500",
    icon: "🔵",
  },
  refund: {
    bg: "bg-yellow-100 dark:bg-yellow-900/30",
    text: "text-yellow-800 dark:text-yellow-400",
    dot: "bg-yellow-500",
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
