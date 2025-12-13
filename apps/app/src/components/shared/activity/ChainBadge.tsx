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
        {label && <span className="text-xs font-medium text-app-secondary">{label}</span>}
        <span className="text-xs font-semibold text-app-tertiary">Pending...</span>
      </div>
    );
  }

  const chainName = SHINOBI_CASH_SUPPORTED_CHAINS.find(c => c.id === Number(chainId))?.name ?? `Chain ${chainId}`;
  const showLink = txHash !== null && txHash !== undefined;

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      {label && <span className="text-xs font-medium text-app-secondary">{label}</span>}
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold text-app-primary text-center">
          {chainName}
        </span>
        {showLink && (
          <a
            href={getTxExplorerUrl(chainId.toString(), txHash)}
            target="_blank"
            rel="noopener noreferrer"
            className="p-0.5 rounded-md hover:bg-app-surface-hover transition-colors duration-200"
            title="View transaction"
          >
            <ExternalLink className="h-3 w-3 text-app-tertiary" />
          </a>
        )}
      </div>
    </div>
  );
}
