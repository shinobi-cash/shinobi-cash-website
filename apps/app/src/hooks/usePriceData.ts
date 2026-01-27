/**
 * Price Data Hook
 * React Query wrapper for fetching token prices
 *
 * Features:
 * - Automatic caching (60s TTL)
 * - Background refresh every 60s
 * - Automatic deduplication (multiple components = 1 API call)
 * - Pauses when tab is hidden
 * - Retry logic with exponential backoff
 *
 * @file hooks/usePriceData.ts
 */

import { useQuery } from "@tanstack/react-query";
import { PRICE_STALE_TIME_MS } from "@/constants/timings";
import { fetchTokenPrice } from "@/utils/price";
import type { TokenSymbol } from "@/types/price";

export interface UsePriceDataResult {
  /** Current USD price for the token (null if loading or error) */
  usdPrice: number | null;
  /** Whether the initial fetch is in progress */
  isLoading: boolean;
  /** Whether a background refresh is in progress */
  isRefetching: boolean;
  /** Error object if fetch failed */
  error: Error | null;
  /** Timestamp of when data was last updated */
  lastUpdated: Date | null;
}

/**
 * Fetches and caches current price for a token
 *
 * @param symbol - Token symbol (e.g., 'ETH')
 * @param options - Optional configuration
 * @returns Price data with loading/error states
 *
 * @example
 * ```tsx
 * const { usdPrice, isLoading } = usePriceData('ETH');
 *
 * if (isLoading) return <span>Loading...</span>;
 * if (!usdPrice) return <span>{ethAmount} ETH</span>;
 *
 * return <span>{ethAmount} ETH ≈ ${(ethAmount * usdPrice).toFixed(2)}</span>;
 * ```
 */
export function usePriceData(
  symbol: TokenSymbol,
  options?: {
    /** Disable automatic background refresh */
    disableRefresh?: boolean;
    /** Custom refresh interval in ms (default: 60000) */
    refreshInterval?: number;
  }
): UsePriceDataResult {
  const { data, isLoading, isRefetching, error, dataUpdatedAt } = useQuery({
    queryKey: ["price", symbol],
    queryFn: () => fetchTokenPrice(symbol),

    // Caching configuration
    staleTime: PRICE_STALE_TIME_MS,
    gcTime: 5 * PRICE_STALE_TIME_MS, // Keep in cache for 5 minutes after last use

    // Background refresh
    refetchInterval: options?.disableRefresh ? false : (options?.refreshInterval ?? PRICE_STALE_TIME_MS),

    // Retry configuration
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),

    // Don't spam on tab switches
    refetchOnWindowFocus: false,

    // Use cached data on mount
    refetchOnMount: false,
  });

  return {
    usdPrice: data ?? null,
    isLoading,
    isRefetching,
    error: error as Error | null,
    lastUpdated: dataUpdatedAt ? new Date(dataUpdatedAt) : null,
  };
}
