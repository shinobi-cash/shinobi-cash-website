/**
 * Toast utility functions using sonner
 * Provides consistent toast messaging across the app
 */

import { toast } from "sonner";
import { getUserMessage, isUserCancellation, logError } from "./errors/errorHandler";

export const showToast = {
  success: (message: string, options?: Parameters<typeof toast.success>[1]) => {
    return toast.success(message, options);
  },

  error: (message: string, options?: Parameters<typeof toast.error>[1]) => {
    return toast.error(message, options);
  },

  info: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, options);
  },

  warning: (message: string, options?: Parameters<typeof toast>[1]) => {
    return toast(message, {
      ...options,
      className: "toast-warning",
    });
  },

  /**
   * Handle error with automatic user-friendly messaging
   * - Automatically extracts user-friendly message from error
   * - Skips toasts for user cancellations (unless forced)
   * - Logs error with context for debugging
   * - Uses consistent duration
   */
  handleError: (
    error: unknown,
    options?: {
      /** Fallback message if error message can't be extracted */
      fallbackMessage?: string;
      /** Action being performed (e.g., "Withdrawal", "Deposit") */
      action?: string;
      /** Additional context for error logging */
      context?: Record<string, unknown>;
      /** Show toast even for user cancellations */
      showCancellations?: boolean;
      /** Custom duration (default: 5000ms) */
      duration?: number;
    },
  ) => {
    // Don't show toasts for user cancellations (unless explicitly requested)
    if (!options?.showCancellations && isUserCancellation(error)) {
      logError(error, {
        action: options?.action,
        ...options?.context,
        suppressed: true,
        reason: "user_cancellation",
      });
      return;
    }

    // Extract user-friendly message
    const message = getUserMessage(error, options?.fallbackMessage);
    const actionPrefix = options?.action ? `${options.action}: ` : "";

    // Log error with context
    logError(error, {
      action: options?.action,
      ...options?.context,
    });

    // Show toast with standardized duration
    return toast.error(`${actionPrefix}${message}`, {
      duration: options?.duration ?? 5000,
    });
  },

  // Utility for authentication actions
  auth: {
    success: (action: string) => {
      return toast.success(`${action} successful!`, {
        duration: 3000,
      });
    },
    error: (action: string) => {
      return toast.error(`${action} failed`, {
        duration: 4000,
      });
    },
  },
};
