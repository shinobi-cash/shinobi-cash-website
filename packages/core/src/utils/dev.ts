/**
 * Development-only utilities
 *
 * These helpers are gated behind NODE_ENV checks and have zero runtime cost in production.
 * Centralized here for easy removal/modification during production optimization.
 */

const IS_DEV = process.env.NODE_ENV === 'development';

/**
 * Development namespace for gated utilities
 *
 * All methods are no-ops in production builds.
 */
export const dev = {
  /**
   * Freeze object in development to detect mutations
   * No-op in production (zero overhead)
   *
   * @param value - Value to freeze in dev mode
   * @returns Frozen value in dev, original value in prod
   *
   * @example
   * ```typescript
   * const chain = dev.freeze([depositNote]);
   * chain.push(note); // Throws in dev, works in prod
   * ```
   */
  freeze<T>(value: T): T {
    if (IS_DEV) {
      return Object.freeze(value);
    }
    return value;
  },

  /**
   * Log message in development only
   * No-op in production (zero overhead)
   *
   * @param args - Arguments to pass to console.log
   *
   * @example
   * ```typescript
   * dev.log('[Discovery] Found', depositCount, 'deposits');
   * ```
   */
  log(...args: unknown[]): void {
    if (IS_DEV) {
      console.log(...args);
    }
  },

  /**
   * Assert condition in development
   * No-op in production (zero overhead)
   *
   * @param condition - Condition to assert
   * @param message - Error message if condition fails
   *
   * @example
   * ```typescript
   * dev.assert(chain.length > 0, 'Chain must not be empty');
   * ```
   */
  assert(condition: boolean, message: string): void {
    if (IS_DEV && !condition) {
      throw new Error(`[DEV ASSERT] ${message}`);
    }
  },
};
