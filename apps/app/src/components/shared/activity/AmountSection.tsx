/**
 * Amount Section Component
 * Displays activity amount with optional breakdown
 * Follows Single Responsibility Principle
 */

import { formatEthAmount } from "@/utils/formatters";
import { SectionCard } from "../SectionCard";

export interface AmountSectionProps {
  amount: bigint | null;
  originalAmount?: bigint | null;
  vettingFeeAmount?: bigint | null;
  activityType: string;
  showBreakdown?: boolean;
}

export function AmountSection({
  amount,
  originalAmount,
  vettingFeeAmount,
  activityType,
  showBreakdown = false
}: AmountSectionProps) {
  const hasBreakdown = showBreakdown &&
    originalAmount != null &&
    originalAmount > BigInt(0) &&
    vettingFeeAmount != null &&
    vettingFeeAmount > BigInt(0);

  const isDeposit = activityType === "DEPOSIT" || activityType === "CROSSCHAIN_DEPOSIT";

  if (hasBreakdown) {
    return (
      <SectionCard title="Deposit Breakdown" headerClassName="px-0 py-1" className="p-2">
        <div className="space-y-2 pt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-app-secondary">Original Amount:</span>
            <span className="text-xs font-semibold text-app-primary tabular-nums">
              {formatEthAmount(originalAmount!)} ETH
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-app-secondary">Vetting Fee:</span>
            <span className="text-xs font-semibold text-red-500 tabular-nums">
              -{formatEthAmount(vettingFeeAmount!)} ETH
            </span>
          </div>

          <div className="border-t border-app-border my-1" />

          <div className="flex justify-between items-center">
            <span className="text-xs font-medium text-app-secondary">Final Amount:</span>
            <span className="text-lg font-bold text-app-primary tabular-nums">
              {formatEthAmount(amount!)} ETH
            </span>
          </div>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard className="p-2">
      <div className="text-center">
        <p className="text-sm font-medium text-app-secondary mb-1">Amount</p>
        <p className="text-2xl font-bold text-app-primary tabular-nums">
          {amount !== null ? `${formatEthAmount(amount)} ETH` : '0 ETH'}
        </p>
        {isDeposit && (
          <p className="text-xs text-app-tertiary mt-0.5">After vetting fees</p>
        )}
      </div>
    </SectionCard>
  );
}
