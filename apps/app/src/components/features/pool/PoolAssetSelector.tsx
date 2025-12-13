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

export function PoolAssetSelector({ selectedAsset, onAssetChange, disabled = false }: PoolAssetSelectorProps) {
  return (
    <button
      type="button"
      onClick={() => onAssetChange?.(selectedAsset)}
      disabled={disabled}
      className="bg-app-card rounded-lg p-2 border border-app hover:bg-app-surface-hover transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white">
            <img src={selectedAsset.icon} alt={`${selectedAsset.name} icon`} className="w-full h-full object-cover" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-app-primary">{selectedAsset.symbol}</p>
            <p className="text-xs text-app-secondary">{selectedAsset.name}</p>
          </div>
        </div>
        <ChevronDown className="w-4 h-4 text-app-secondary" />
      </div>
    </button>
  );
}
