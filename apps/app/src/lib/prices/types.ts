/**
 * Price Data Types
 *
 * USD VALUE SEMANTICS:
 * All USD values are informational estimates only, based on latest spot price.
 * - Updated every 60 seconds
 * - Not guaranteed to reflect actual transaction value
 * - Always displayed with ≈ symbol to indicate approximation
 * - USD values are NOT used for transaction amounts or on-chain operations
 * - ETH amounts remain the source of truth
 *
 * @file lib/prices/types.ts
 */

export interface PriceData {
  symbol: string;
  usdPrice: number;
  lastUpdatedAt: string;
}

export interface PricesApiResponse {
  success: boolean;
  data?: PriceData[];
  error?: string;
  timestamp?: string;
}

export type TokenSymbol = 'ETH'; // Extensible for future tokens (USDC, DAI, etc.)
