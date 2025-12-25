/**
 * Chain Badge Component
 * Displays chain information with optional transaction link
 * Follows Single Responsibility Principle
 */

import { ExternalLink } from "lucide-react";
import { getTxExplorerUrl } from "@/config/chains";
import { SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { cn } from "@/lib/utils";

export interface ChainBadgeProps {
  chainId: bigint | null;
  txHash?: string | null;
  label?: string;
  className?: string;
}

export function ChainBadge({ chainId, txHash, label, className }: ChainBadgeProps) {
  if (chainId === null) {
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        {label && <span className="text-app-secondary text-xs font-medium">{label}</span>}
        <span className="text-app-tertiary text-xs font-semibold">Pending...</span>
      </div>
    );
  }

  const chainName =
    SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === Number(chainId))?.name ?? `Chain ${chainId}`;
  const showLink = txHash !== null && txHash !== undefined;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {label && <span className="text-app-secondary text-xs font-medium">{label}</span>}
      <div className="flex items-center gap-1">
        <span className="text-app-primary text-center text-xs font-semibold">{chainName}</span>
        {showLink && (
          <a
            href={getTxExplorerUrl(chainId.toString(), txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-app-surface-hover rounded-md p-0.5 transition-colors duration-200"
            title="View transaction"
          >
            <ExternalLink className="text-app-tertiary h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
