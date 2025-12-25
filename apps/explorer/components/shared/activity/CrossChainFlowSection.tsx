/**
 * Cross-Chain Flow Section Component
 * Displays origin and destination chain information
 * Follows Single Responsibility Principle
 */

import { ArrowRight } from "lucide-react";
import { SectionCard } from "../SectionCard";
import { ChainBadge } from "./ChainBadge";

export interface CrossChainFlowSectionProps {
  originChainId: bigint | null;
  originTxHash?: string | null;
  destinationChainId: bigint | null | undefined;
  destinationTxHash?: string | null;
}

export function CrossChainFlowSection({
  originChainId,
  originTxHash,
  destinationChainId,
  destinationTxHash,
}: CrossChainFlowSectionProps) {
  return (
    <SectionCard title="Cross-Chain Flow" className="overflow-hidden" contentClassName="px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <ChainBadge
          chainId={originChainId}
          txHash={originTxHash}
          label="Origin"
          className="flex-1"
        />

        <ArrowRight className="text-app-tertiary h-4 w-4 flex-shrink-0" />

        <ChainBadge
          chainId={destinationChainId ?? null}
          txHash={destinationTxHash}
          label="Destination"
          className="flex-1"
        />
      </div>
    </SectionCard>
  );
}
