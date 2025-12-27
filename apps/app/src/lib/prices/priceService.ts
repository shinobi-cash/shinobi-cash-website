/**
 * Price Service - Client-side API client
 * Pure API client that calls our Next.js API endpoint
 * (No caching - React Query handles that)
 *
 * @file lib/prices/priceService.ts
 */

import type { PricesApiResponse, TokenSymbol } from './types';

/**
 * Fetches current price for a token
 * Calls our Next.js API proxy (which calls Alchemy server-side)
 *
 * @param symbol - Token symbol (e.g., 'ETH')
 * @returns USD price for the token
 * @throws Error if API call fails
 */
export async function fetchTokenPrice(symbol: TokenSymbol): Promise<number> {
  const response = await fetch(`/api/prices?symbols=${symbol}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Price API error: ${response.status} ${response.statusText}`);
  }

  const data: PricesApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch price data');
  }

  // Find the requested token in the response
  const priceData = data.data.find((p) => p.symbol === symbol);

  if (!priceData) {
    throw new Error(`Price not found for symbol: ${symbol}`);
  }

  return priceData.usdPrice;
}

/**
 * Fetches prices for multiple tokens (for future use)
 *
 * @param symbols - Array of token symbols
 * @returns Map of symbol to USD price
 */
export async function fetchTokenPrices(
  symbols: TokenSymbol[]
): Promise<Map<TokenSymbol, number>> {
  const symbolsParam = symbols.join(',');
  const response = await fetch(`/api/prices?symbols=${symbolsParam}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Price API error: ${response.status} ${response.statusText}`);
  }

  const data: PricesApiResponse = await response.json();

  if (!data.success || !data.data) {
    throw new Error(data.error || 'Failed to fetch price data');
  }

  // Convert array to map
  const pricesMap = new Map<TokenSymbol, number>();
  for (const priceData of data.data) {
    pricesMap.set(priceData.symbol as TokenSymbol, priceData.usdPrice);
  }

  return pricesMap;
}
