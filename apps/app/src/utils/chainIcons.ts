/**
 * Chain Icon Mapping Utility
 * Centralized mapping of chain IDs to their icon paths
 */

export const CHAIN_ICON_MAP: Record<number, string> = {
  // Mainnets
  1: "/chains/eth-diamond-black-white.svg", // Ethereum Mainnet
  8453: "/chains/Base_square_blue.svg", // Base Mainnet
  10: "/chains/OPMainnet_square.svg", // Optimism Mainnet
  42161: "/chains/AF_logomark.svg", // Arbitrum One
  // Testnets
  421614: "/chains/AF_logomark.svg", // Arbitrum Sepolia
  84532: "/chains/Base_square_blue.svg", // Base Sepolia
  11155111: "/chains/eth-diamond-black-white.svg", // Sepolia
  11155420: "/chains/OPMainnet_square.svg", // OP Sepolia
};

export const CHAIN_NAME_MAP: Record<number, string> = {
  // Mainnets
  1: "Ethereum",
  8453: "Base",
  10: "Optimism",
  42161: "Arbitrum",
  // Testnets
  421614: "Arbitrum Sepolia",
  84532: "Base Sepolia",
  11155111: "Sepolia",
  11155420: "OP Sepolia",
};

export const CHAIN_SHORT_NAME_MAP: Record<number, string> = {
  // Mainnets
  1: "ETH",
  8453: "BASE",
  10: "OP",
  42161: "ARB",
  // Testnets
  421614: "ARB",
  84532: "BASE",
  11155111: "SEP",
  11155420: "OP",
};

/**
 * Get chain icon path by chain ID
 */
export function getChainIcon(chainId: number): string {
  return CHAIN_ICON_MAP[chainId] || "/chains/eth-diamond-black-white.svg";
}

/**
 * Get chain name by chain ID
 */
export function getChainName(chainId: number): string {
  return CHAIN_NAME_MAP[chainId] || "Unknown";
}

/**
 * Get chain short name by chain ID (for compact labels)
 */
export function getChainShortName(chainId: number | string): string {
  const id = Number(chainId);
  return CHAIN_SHORT_NAME_MAP[id] || `C${id}`;
}

/**
 * Generate a note label with chain prefix
 * Format: "ARB #1" or "BASE #2"
 */
export function getNoteLabel(originChainId: number | string, depositIndex: number): string {
  const chainShort = getChainShortName(originChainId);
  return `${chainShort} #${depositIndex + 1}`;
}

const ASSET_ICON_MAP: Record<string, string> = {
  ETH: "/chains/eth-diamond-black-white.svg",
  OP: "/chains/OPMainnet_square.svg",
  ARB: "/chains/AF_logomark.svg",
};

/**
 * Get asset icon path by symbol
 */
export function getAssetIcon(assetSymbol: string): string {
  return ASSET_ICON_MAP[assetSymbol] || "/chains/eth-diamond-black-white.svg";
}
