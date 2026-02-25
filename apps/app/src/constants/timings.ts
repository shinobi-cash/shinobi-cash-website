/**
 * Centralized timing and retry constants
 *
 * Consolidates magic numbers for better maintainability.
 */

// ============ TRANSACTION TRACKING ============

/** Timeout for waiting on transaction receipt (ms) */
export const TX_RECEIPT_TIMEOUT_MS = 60_000;

/** Interval for polling indexer for transaction status (ms) */
export const INDEXER_POLL_INTERVAL_MS = 5_000;

// ============ CONTROLLER DEBOUNCING ============

/** Debounce delay for withdrawal preview (ms) */
export const PREVIEW_DEBOUNCE_MS = 500;

/** Debounce delay for deposit preparation (ms) */
export const PREPARE_DEBOUNCE_MS = 1_000;

// ============ RETRY CONFIGURATION ============

/** Maximum retries for deposit commitment generation */
export const DEPOSIT_COMMITMENT_MAX_RETRIES = 3;

/** Delay between deposit commitment retries (ms) */
export const DEPOSIT_COMMITMENT_RETRY_DELAY_MS = 1_000;

// ============ UI FEEDBACK ============

/** Duration to show "copied" feedback (ms) */
export const COPY_FEEDBACK_DURATION_MS = 2_000;

/** Default toast notification duration (ms) */
export const TOAST_DURATION_MS = 3_000;

/** Error toast notification duration (ms) */
export const TOAST_ERROR_DURATION_MS = 4_000;

// ============ CACHE TTLs ============

/** Indexer API request timeout (ms) */
export const INDEXER_REQUEST_TIMEOUT_MS = 30_000;

/** Cache TTL for state tree data (seconds) */
export const STATE_TREE_CACHE_TTL_SECONDS = 30;

/** Cache TTL for ASP root data (seconds) */
export const ASP_ROOT_CACHE_TTL_SECONDS = 60;

/** Cache TTL for price data (seconds) */
export const PRICE_CACHE_TTL_SECONDS = 60;

/** Price data stale time for React Query (ms) */
export const PRICE_STALE_TIME_MS = 60_000;
