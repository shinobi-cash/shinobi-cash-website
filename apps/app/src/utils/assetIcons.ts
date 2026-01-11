/**
 * Asset Icon Mapping Utility
 */

export const ASSET_ICON_MAP: Record<string, string> = {
  ETH: "/chains/eth-diamond-black-white.svg", // Ethereum Mainnet
  OP: "/chains/OPMainnet_square.svg", // Optimism Mainnet
  ARB: "/chains/AF_logomark.svg", // Arbitrum One
};

export const ASSET_SYMBOL_MAP: Record<string, string> = {
  ETH: "Ethereum",
  OP: "Optimism",
  ARB: "Arbitrum",
};

/**
 * Get chain icon path by chain ID
 */
export function getAssetIcon(assetSymbol: string): string {
  return ASSET_ICON_MAP[assetSymbol] || "/chains/eth-diamond-black-white.svg";
}

/**
 * Get chain name by chain ID
 */
export function getAssetName(chainId: string): string {
  return ASSET_SYMBOL_MAP[chainId] || "Unknown";
}
