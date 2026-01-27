/**
 * Asset Chain Component
 * Displays asset icon with chain badge overlay
 * Used in both deposit and withdrawal forms
 */

import Image from "next/image";
import { getChainIcon } from "@/utils/chainIcons";
import { getAssetIcon } from "@/utils/assetIcons";
import { Banknote } from "lucide-react";
import { POOL_CHAIN } from "@shinobi-cash/constants";

interface AssetChainProps {
  assetSymbol: string;
  chainId: number;
  className?: string;
}

export function AssetChain({ assetSymbol, chainId, className = "" }: AssetChainProps) {
  const assetIcon = getAssetIcon(assetSymbol);
  const chainIcon = getChainIcon(chainId);

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Asset icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
          <Image src={assetIcon} alt={assetSymbol} width={24} height={24} className="h-6 w-6" />
        </div>
        {/* Chain badge - smaller, overlayed on bottom-right */}
        <div className="border-background absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white">
          <Image src={chainIcon} alt="Chain" width={12} height={12} className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}

export function ShinobiCashNote({ className = "" }: { className?: string }) {
  const chainIcon = getChainIcon(POOL_CHAIN.id);

  return (
    <div className={`flex shrink-0 items-center gap-2 ${className}`}>
      <div className="relative">
        {/* Note icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
          <Banknote className="h-6 w-6" />
        </div>
        {/* Chain badge - smaller, overlayed on bottom-right */}
        <div className="border-background absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white">
          <Image src={chainIcon} alt="Pool Chain" width={12} height={12} className="h-3 w-3" />
        </div>
      </div>
    </div>
  );
}
