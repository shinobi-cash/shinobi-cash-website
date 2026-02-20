/**
 * Convert string to bigint, returning null if input is null/undefined
 */
export const toBigInt = (value: string | null | undefined): bigint | null =>
  value ? BigInt(value) : null;

/**
 * Convert string to number, returning null if input is null/undefined
 */
export const toNumber = (value: string | null | undefined): number | null =>
  value ? Number(value) : null;

/**
 * Convert timestamp string to Date object
 */
export const toDate = (timestamp: string): Date => new Date(Number(timestamp) * 1000);

/**
 * Format amount in wei to ETH string with specified decimals
 */
export const formatEth = (weiAmount: string | bigint, decimals: number = 4): string => {
  const wei = typeof weiAmount === "string" ? BigInt(weiAmount) : weiAmount;
  const eth = Number(wei) / 1e18;
  return eth.toFixed(decimals);
};

/**
 * Parse chain ID to number (handles both string and number input)
 */
export const parseChainId = (chainId: string | number): number =>
  typeof chainId === "string" ? Number(chainId) : chainId;
