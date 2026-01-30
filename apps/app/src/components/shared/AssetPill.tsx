/**
 * AssetPill Component
 * Rounded pill displaying asset icon with chain badge overlay
 */

import Image from "next/image";
import { getChainIcon } from "@/utils/chainIcons";
import { cn } from "@workspace/ui/lib/utils";

interface AssetPillProps {
  asset: {
    symbol: string;
    icon: string;
  };
  chainId: number;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function AssetPill({
  asset,
  chainId,
  onClick,
  disabled = false,
  className,
}: AssetPillProps) {
  const isInteractive = onClick !== undefined && !disabled;
  const Component = onClick ? "button" : "div";

  return (
    <Component
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1.5",
        isInteractive && "cursor-pointer transition-colors hover:bg-white/[0.08]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div className="relative">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600">
          <Image src={asset.icon} alt={asset.symbol} width={20} height={20} className="h-5 w-5" />
        </div>
        <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border-2 border-neutral-900 bg-white">
          <Image
            src={getChainIcon(chainId)}
            alt="Chain"
            width={10}
            height={10}
            className="h-2.5 w-2.5"
          />
        </div>
      </div>

      <span className="text-sm font-semibold text-white">{asset.symbol}</span>
    </Component>
  );
}
