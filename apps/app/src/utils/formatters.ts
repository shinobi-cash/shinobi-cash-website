import { formatDistance } from "date-fns";
import { formatEther, parseEther } from "viem/utils";

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
export function formatSmallEthAmount(
  amount: string | number,
  significantDigits = 2
): string {
  const num = typeof amount === "string" ? Number.parseFloat(amount) : amount;

  if (num === 0 || Number.isNaN(num)) return "0";
  if (num >= 0.01) return num.toFixed(4); // Normal formatting for larger amounts

  // For small numbers, find first non-zero digit and show significantDigits after
  const str = num.toFixed(18);
  const match = str.match(/^0\.(0*)([1-9]\d*)/);

  if (!match) return num.toFixed(6);

  const leadingZeros = match[1].length;
  const decimalsNeeded = leadingZeros + significantDigits;

  return num.toFixed(Math.min(decimalsNeeded, 18));
}
