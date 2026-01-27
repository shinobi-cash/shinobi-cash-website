const ASSET_ICON_MAP: Record<string, string> = {
  ETH: "/chains/eth-diamond-black-white.svg",
  OP: "/chains/OPMainnet_square.svg",
  ARB: "/chains/AF_logomark.svg",
};

export function getAssetIcon(assetSymbol: string): string {
  return ASSET_ICON_MAP[assetSymbol] || "/chains/eth-diamond-black-white.svg";
}
