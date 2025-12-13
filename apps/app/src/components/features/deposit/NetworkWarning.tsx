import { memo } from "react";
import { AlertTriangle, Info } from "lucide-react";

type WarningType = "error" | "warning" | "info";

interface NetworkWarningProps {
  type?: WarningType;
  title: string;
  message: string;
}

const WARNING_STYLES = {
  error: {
    container: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    title: "text-red-800 dark:text-red-200",
    message: "text-red-600 dark:text-red-400",
    Icon: AlertTriangle,
  },
  warning: {
    container: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800",
    icon: "text-orange-600 dark:text-orange-400",
    title: "text-orange-800 dark:text-orange-200",
    message: "text-orange-600 dark:text-orange-400",
    Icon: AlertTriangle,
  },
  info: {
    container: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
    icon: "text-blue-600 dark:text-blue-400",
    title: "text-blue-800 dark:text-blue-200",
    message: "text-blue-600 dark:text-blue-400",
    Icon: Info,
  },
} as const;

export const NetworkWarning = memo(({
  type = "warning",
  title,
  message,
}: NetworkWarningProps) => {
  const styles = WARNING_STYLES[type];
  const IconComponent = styles.Icon;

  return (
    <div className={`${styles.container} border rounded-xl p-2 mb-4`}>
      <div className="flex items-center gap-2">
        <IconComponent className={`w-4 h-4 ${styles.icon}`} />
        <div>
          <p className={`text-xs font-medium ${styles.title}`}>{title}</p>
          <p className={`text-xs ${styles.message}`}>{message}</p>
        </div>
      </div>
    </div>
  );
});

NetworkWarning.displayName = 'NetworkWarning';
