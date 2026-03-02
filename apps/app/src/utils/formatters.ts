import { formatDistance, formatDuration, intervalToDuration } from "date-fns";
import { formatEther, parseEther } from "viem/utils";
import { DISPLAY_DECIMALS } from "@/constants/withdraw";

export interface EthFormattingOptions {
  decimals?: number;
  minDecimals?: number;
  maxDecimals?: number;
}

export function formatEthAmount(
  amount: string | number | bigint | null | undefined,
  options: EthFormattingOptions = {}
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
    const num = Number.parseFloat(ethString);

    // Apply decimal formatting
    if (options.decimals !== undefined) {
      // Fixed decimal places
      return num.toFixed(options.decimals);
    }

    // Dynamic decimal formatting
    const { minDecimals = 0, maxDecimals = 18 } = options;

    // For small amounts, use significant digits formatting
    if (num > 0 && num < 0.01) {
      return formatSmallEthAmount(num, 2);
    }

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

export function formatHash(hash: string, startChars = 6, endChars = 4): string {
  if (!hash || hash.length <= startChars + endChars) {
    return hash;
  }
  return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
}

export function formatTimestamp(timestamp: string | bigint): string {
  const numericTimestamp =
    typeof timestamp === "bigint" ? Number(timestamp) : Number.parseInt(timestamp);
  return formatDistance(new Date(numericTimestamp * 1000), new Date(), { addSuffix: true });
}

/**
 * Format a date as "Wednesday, 7 November at 23:16"
 */
export function formatDateTime(date: Date): string {
  const dayName = date.toLocaleDateString([], { weekday: "long" });
  const day = date.getDate();
  const month = date.toLocaleDateString([], { month: "long" });
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${dayName}, ${day} ${month} at ${time}`;
}

export function formatUsdAmount(amount: number, decimals?: number): string {
  // For zero or explicit decimals, use fixed formatting
  if (amount === 0 || decimals !== undefined) {
    const effectiveDecimals = decimals ?? 2;
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: effectiveDecimals,
      maximumFractionDigits: effectiveDecimals,
    })}`;
  }

  // For amounts >= $0.01, use 2 decimals
  if (amount >= 0.01) {
    return `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // For small amounts, show significant digits (similar to formatSmallEthAmount)
  const str = amount.toFixed(18);
  const match = str.match(/^0\.(0*)([1-9]\d*)/);

  if (!match) {
    return `$${amount.toFixed(2)}`;
  }

  const leadingZeros = match[1].length;
  const decimalsNeeded = leadingZeros + 2; // Show 2 significant digits

  return `$${amount.toFixed(Math.min(decimalsNeeded, 8))}`;
}

/**
 * Format small ETH amounts with significant digits
 * e.g. 0.00000824788188 -> "0.0000082"
 * Shows leading zeros + specified significant digits
 */
export function formatSmallEthAmount(amount: string | number, significantDigits = 2): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  if (num === 0 || Number.isNaN(num)) return "0";
  if (num >= 0.01) return num.toFixed(DISPLAY_DECIMALS);

  // For small numbers, find first non-zero digit and show significantDigits after
  const str = num.toFixed(18);
  const match = str.match(/^0\.(0*)([1-9]\d*)/);

  if (!match) return num.toFixed(DISPLAY_DECIMALS + 2);

  const leadingZeros = match[1].length;
  const decimalsNeeded = leadingZeros + significantDigits;

  return num.toFixed(Math.min(decimalsNeeded, 18));
}

/**
 * Format ETH amount for display with consistent precision
 * Shows enough decimals to represent the value accurately (min 4, up to 6 for small amounts)
 */
export function formatDisplayAmount(amount: string | number | bigint | null | undefined): string {
  if (amount === null || amount === undefined) return "0";

  const num =
    typeof amount === "bigint"
      ? parseFloat(formatEther(amount))
      : typeof amount === "string"
        ? parseFloat(amount)
        : amount;

  if (isNaN(num) || num === 0) return "0";

  // For very small amounts (< 0.0001), use significant digits formatting
  if (num > 0 && num < 0.0001) {
    return formatSmallEthAmount(num, 2);
  }

  // For small amounts (< 0.01), use 6 decimals to show fee differences
  // For larger amounts (>= 0.01), use 4 decimals
  const decimals = num < 0.01 ? 6 : DISPLAY_DECIMALS;

  // Format and remove trailing zeros
  const formatted = num.toFixed(decimals);
  return formatted.replace(/\.?0+$/, "") || "0";
}

export function formatHumanDuration(seconds: number): string {
  const duration = intervalToDuration({ start: 0, end: seconds * 1000 });
  return formatDuration(duration, { format: seconds >= 3600 ? ["hours"] : ["minutes"] });
}
