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
  const isButton = onClick !== undefined;

  const baseStyles = "flex shrink-0 items-center gap-2";
  const interactiveStyles = isButton ? "cursor-pointer transition-opacity hover:opacity-80" : "";
  const disabledStyles = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <Component
      onClick={disabled ? undefined : onClick}
      {...(isButton ? { disabled } : { "aria-disabled": disabled })}
      className={`${baseStyles} ${interactiveStyles} ${disabledStyles} ${className}`}
    >
      <div className="relative">
        {/* Asset icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600">
          <Image src={asset.icon} alt={asset.symbol} width={24} height={24} className="h-6 w-6" />
        </div>
        {/* Chain badge - smaller, overlayed on bottom-right */}
        <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-900 bg-white">
          <Image
            src={getChainIcon(chainId)}
            alt="Chain"
            width={12}
            height={12}
            className="h-3 w-3"
          />
        </div>
      </div>
      <span className="text-base font-medium text-white">{asset.symbol}</span>
      {showChevron && onClick && (
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </Component>
  );
}
