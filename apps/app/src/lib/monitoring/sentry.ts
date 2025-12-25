/**
 * Sentry Error Monitoring Configuration
 *
 * Setup guide:
 * 1. Create account at https://sentry.io
 * 2. Create new React project
 * 3. Copy DSN to .env file as VITE_SENTRY_DSN
 * 4. Set VITE_SENTRY_ENVIRONMENT (development/staging/production)
 */

import * as Sentry from "@sentry/react";
import { AppError } from "@/lib/errors";

/**
 * Initialize Sentry monitoring
 * Call this in main.tsx before rendering the app
 */
export function initializeSentry() {
  // Only initialize in production or if explicitly enabled
  const isEnabled =
    process.env.NODE_ENV === "production" || process.env.NEXT_PUBLIC_SENTRY_ENABLED === "true";

  if (!isEnabled) {
    console.log("[Sentry] Monitoring disabled in development");
    return;
  }

  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

  if (!dsn) {
    console.warn("[Sentry] DSN not configured, monitoring disabled");
    return;
  }

  Sentry.init({
    dsn,

    // Environment (development, staging, production)
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,

    // Release version (for tracking which code version had the error)
    release: process.env.NEXT_PUBLIC_APP_VERSION,

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0, // 10% in prod, 100% in dev

    // Session replay (records user interactions before error)
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integrations
    integrations: [
      // Browser performance tracking
      Sentry.browserTracingIntegration(),

      // Session replay for debugging
      Sentry.replayIntegration({
        maskAllText: true, // Mask sensitive text
        blockAllMedia: true, // Block images/video for privacy
      }),
    ],

    // Privacy & Filtering
    beforeSend(event, hint) {
      // Filter out expected/operational errors that shouldn't be reported
      const error = hint.originalException;

      // Don't report user cancellations
      if (error instanceof AppError) {
        if (error.code === "USER_REJECTED" || error.code === "PASSKEY_CANCELLED") {
          return null;
        }

        // Don't report operational network errors (expected when offline)
        if (error.isOperational && error.category === "NETWORK") {
          return null;
        }
      }

      // Sanitize sensitive data from error messages
      if (event.message) {
        event.message = sanitizeMessage(event.message);
      }

      // Sanitize breadcrumbs (user activity trail)
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => ({
          ...breadcrumb,
          message: breadcrumb.message ? sanitizeMessage(breadcrumb.message) : undefined,
          data: breadcrumb.data ? sanitizeData(breadcrumb.data) : undefined,
        }));
      }

      // Sanitize context data
      if (event.contexts) {
        event.contexts = sanitizeData(event.contexts);
      }

      return event;
    },

    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",

      // Network errors (handled gracefully)
      "NetworkError",
      "Failed to fetch",
      "Load failed",

      // User cancellations (not real errors)
      "User denied",
      "User rejected",
      "AbortError",
    ],
  });

  console.log("[Sentry] Monitoring initialized", {
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_APP_VERSION,
  });
}

/**
 * Report error to Sentry with structured context
 */
export function reportErrorToSentry(error: unknown, context?: Record<string, unknown>): void {
  // Set context tags for filtering/searching in Sentry
  if (error instanceof AppError) {
    Sentry.setTag("error_category", error.category);
    Sentry.setTag("error_code", error.code);
    Sentry.setTag("is_operational", error.isOperational);
  }

  // Set custom context data
  if (context) {
    Sentry.setContext("error_context", sanitizeData(context));
  }

  // Capture the error
  if (error instanceof Error) {
    Sentry.captureException(error);
  } else {
    Sentry.captureMessage(String(error), "error");
  }
}

/**
 * Set user context for error tracking
 * Call this after user authentication
 */
export function setSentryUser(userId: string | null) {
  if (userId) {
    Sentry.setUser({
      id: hashUserId(userId), // Hash for privacy
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb (user action trail) for debugging
 */
export function addSentryBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level: "info" | "warning" | "error" = "info"
) {
  Sentry.addBreadcrumb({
    message: sanitizeMessage(message),
    data: data ? sanitizeData(data) : undefined,
    level,
    timestamp: Date.now() / 1000,
  });
}

// ============ PRIVACY HELPERS ============

/**
 * Sanitize error messages to remove sensitive data
 */
function sanitizeMessage(message: string): string {
  return (
    message
      // Remove Ethereum addresses
      .replace(/0x[a-fA-F0-9]{40}/g, "0x[ADDRESS]")
      // Remove transaction hashes
      .replace(/0x[a-fA-F0-9]{64}/g, "0x[HASH]")
      // Remove numbers that might be private keys or amounts
      .replace(/\b\d{10,}\b/g, "[NUMBER]")
      // Remove email addresses
      .replace(/[\w.-]+@[\w.-]+\.\w+/g, "[EMAIL]")
  );
}

/**
 * Sanitize data objects to remove sensitive fields
 */
function sanitizeData<T>(data: T): T {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  const sensitiveKeys = [
    "privateKey",
    "mnemonic",
    "password",
    "secret",
    "token",
    "apiKey",
    "accountKey",
  ];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item)) as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    // Redact sensitive keys
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = sanitizeData(value);
    } else if (typeof value === "string") {
      result[key] = sanitizeMessage(value);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Hash user ID for privacy (one-way hash)
 */
function hashUserId(userId: string): string {
  // Simple hash for demo - use a proper hash in production
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash).toString(16)}`;
}
