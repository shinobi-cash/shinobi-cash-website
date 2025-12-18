/**
 * Token Chain Selector Component
 * Displays asset icon with chain badge overlay and asset symbol
 * Used in both deposit and withdrawal forms
 */

import Image from "next/image";
import { getChainIcon } from "@/utils/chainIcons";

interface TokenChainSelectorProps {
  asset: {
    icon: string;
    symbol: string;
    name: string;
  };
  chainId: number;
  onClick?: () => void;
  disabled?: boolean;
  showChevron?: boolean;
  className?: string;
}

export function TokenChainSelector({
  asset,
  chainId,
  onClick,
  disabled = false,
  showChevron = true,
  className = "",
}: TokenChainSelectorProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-2 shrink-0 ${onClick ? "hover:opacity-80 transition-opacity cursor-pointer" : ""} ${className}`}
    >
      <div className="relative">
        {/* Asset icon */}
        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
          <Image
            src={asset.icon}
            alt={asset.symbol}
            width={24}
            height={24}
            className="w-6 h-6"
          />
        </div>
        {/* Chain badge - smaller, overlayed on bottom-right */}
        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white rounded-full flex items-center justify-center border-2 border-gray-900">
          <Image
            src={getChainIcon(chainId)}
            alt="Chain"
            width={12}
            height={12}
            className="w-3 h-3"
          />
        </div>
      </div>
      <span className="text-base font-medium text-white">{asset.symbol}</span>
      {showChevron && onClick && (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </Component>
  );
}
