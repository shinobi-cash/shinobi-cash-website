/**
 * Centralized timing and retry constants
 *
 * Consolidates magic numbers for better maintainability.
 */

// ============ TRANSACTION TRACKING ============

/** Timeout for waiting on transaction receipt (ms) */
export const TX_RECEIPT_TIMEOUT_MS = 60_000;

// ============ CONTROLLER DEBOUNCING ============

/** Debounce delay for withdrawal preview (ms) */
export const PREVIEW_DEBOUNCE_MS = 500;

/** Debounce delay for deposit preparation (ms) */
export const PREPARE_DEBOUNCE_MS = 1_000;

// ============ UI FEEDBACK ============

/** Duration to show "copied" feedback (ms) */
export const COPY_FEEDBACK_DURATION_MS = 2_000;

// ============ CACHE TTLs ============

/** Indexer API request timeout (ms) */
export const INDEXER_REQUEST_TIMEOUT_MS = 30_000;

/** Cache TTL for state tree data (seconds) */
export const STATE_TREE_CACHE_TTL_SECONDS = 30;

/** Cache TTL for ASP root data (seconds) */
export const ASP_ROOT_CACHE_TTL_SECONDS = 60;

/** Price data stale time for React Query (ms) */
export const PRICE_STALE_TIME_MS = 60_000;
