/**
 * Asset Selector
 * Allows users to select different assets to view their respective pools
 * Currently supports ETH, designed for future multi-asset support
 */

import { ChevronDown } from "lucide-react";

interface Asset {
  symbol: string;
  name: string;
  icon: string;
}

interface PoolAssetSelectorProps {
  selectedAsset: Asset;
  onAssetChange?: (asset: Asset) => void;
  disabled?: boolean;
}

export function PoolAssetSelector({
  selectedAsset,
  onAssetChange,
  disabled = false,
}: PoolAssetSelectorProps) {
  return (
    <button
      type="button"
      onClick={() => onAssetChange?.(selectedAsset)}
      disabled={disabled}
      className="bg-app-card border-app hover:bg-app-surface-hover w-full rounded-lg border p-2 transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white">
            <img
              src={selectedAsset.icon}
              alt={`${selectedAsset.name} icon`}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="text-left">
            <p className="text-app-primary text-sm font-semibold">{selectedAsset.symbol}</p>
            <p className="text-app-secondary text-xs">{selectedAsset.name}</p>
          </div>
        </div>
        <ChevronDown className="text-app-secondary h-4 w-4" />
      </div>
    </button>
  );
}
