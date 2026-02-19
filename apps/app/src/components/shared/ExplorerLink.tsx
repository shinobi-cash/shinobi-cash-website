/**
 * Explorer Link Component
 * Clickable link to block explorer for a transaction
 */

import { ExternalLink } from "lucide-react";
import { getTxExplorerUrl, getChainName } from "@/config/chains";

interface ExplorerLinkProps {
  chainId: string | number;
  txHash: string;
  size?: "sm" | "default";
}

export function ExplorerLink({ chainId, txHash, size = "default" }: ExplorerLinkProps) {
  const numericChainId = typeof chainId === "string" ? Number(chainId) : chainId;
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  return (
    <a
      href={getTxExplorerUrl(numericChainId, txHash)}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 ${textSize} text-blue-400 hover:text-blue-300`}
    >
      {getChainName(numericChainId)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}
