/**
 * Utility functions for formatting values in the application
 */

import { formatDistance } from "date-fns";
import { formatEther, parseEther } from "viem";

export interface EthFormattingOptions {
  /** Number of decimal places to show. If undefined, removes trailing zeros */
  decimals?: number;
  /** Minimum number of decimal places to show (only when decimals is undefined) */
  minDecimals?: number;
  /** Maximum number of decimal places to show (only when decimals is undefined) */
  maxDecimals?: number;
}

/**
 * Format ETH amounts with consistent precision using viem for accuracy
 * Handles multiple input types and provides flexible decimal formatting
 *
 * @param amount - Amount to format (wei string, ETH number/string, bigint, or null)
 * @param options - Formatting options
 * @returns Formatted ETH amount string
 */
export function formatEthAmount(
  amount: string | number | bigint | null | undefined,
  options: EthFormattingOptions = {},
): string {
  if (!amount || amount === 0 || amount === BigInt(0)) {
    const { decimals = 0 } = options;
    return decimals > 0 ? `0.${"0".repeat(decimals)}` : "0";
  }

  try {
    let weiAmount: bigint;

    // Handle different input types
    if (typeof amount === "bigint") {
      weiAmount = amount;
    } else if (typeof amount === "string") {
      // Check if it's already in wei (large number) or ETH (small number with decimals)
      if (amount.includes(".") || Number.parseFloat(amount) < 1000) {
        // Treat as ETH amount, convert to wei
        weiAmount = parseEther(amount);
      } else {
        // Treat as wei amount
        weiAmount = BigInt(amount);
      }
    } else {
      // Number input - treat as ETH amount
      weiAmount = parseEther(amount.toString());
    }

    // Convert wei to ETH string
    const ethString = formatEther(weiAmount);

    // Apply decimal formatting
    if (options.decimals !== undefined) {
      // Fixed decimal places
      const num = Number.parseFloat(ethString);
      return num.toFixed(options.decimals);
    }
    // Dynamic decimal formatting
    const { minDecimals = 0, maxDecimals = 18 } = options;

    // Remove trailing zeros but respect minimum decimals
    let formatted = ethString.replace(/\.?0+$/, "") || "0";

    // Ensure minimum decimal places
    if (minDecimals > 0) {
      const parts = formatted.split(".");
      if (parts.length === 1) {
        formatted += `.${"0".repeat(minDecimals)}`;
      } else {
        const currentDecimals = parts[1].length;
        if (currentDecimals < minDecimals) {
          formatted += "0".repeat(minDecimals - currentDecimals);
        }
      }
    }

    // Limit maximum decimal places
    if (maxDecimals < 18) {
      const parts = formatted.split(".");
      if (parts.length > 1 && parts[1].length > maxDecimals) {
        formatted = `${parts[0]}.${parts[1].substring(0, maxDecimals)}`;
        // Remove trailing zeros after truncation
        formatted = formatted.replace(/\.?0+$/, "") || parts[0];
      }
    }

    return formatted;
  } catch {
    const { decimals = 0 } = options;
    return decimals > 0 ? `0.${"0".repeat(decimals)}` : "0";
  }
}

/**
 * Format hash strings for display (6 chars + ... + 4 chars)
 *
 * @param hash - Hash string to format
 * @param startChars - Number of characters to show at start (default: 6)
 * @param endChars - Number of characters to show at end (default: 4)
 * @returns Formatted hash string
 */
export function formatHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash || hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

/**
 * Format timestamp for relative display (e.g., "2 hours ago")
 * Accepts string or bigint timestamp
 */
export function formatTimestamp(timestamp: string | bigint): string {
  const numericTimestamp = typeof timestamp === "bigint" ? Number(timestamp) : Number.parseInt(timestamp);
  return formatDistance(new Date(numericTimestamp * 1000), new Date(), { addSuffix: true });
}

/**
 * Format timestamp as a date (e.g., "12/25/2023")
 */
export function formatDate(timestamp: string | number): string {
  const date = typeof timestamp === "string" ? new Date(Number.parseInt(timestamp) * 1000) : new Date(timestamp);
  return date.toLocaleDateString();
}
