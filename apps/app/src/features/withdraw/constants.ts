/**
 * Withdrawal Feature Constants
 */

/**
 * Number of decimal places to display for ETH amounts
 * Centralized to prevent UI inconsistency
 */
export const DISPLAY_DECIMALS = 4;

/**
 * Default asset for withdrawals
 */
export const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
} as const;
