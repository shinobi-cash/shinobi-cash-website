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
  showBreakdown = false,
}: AmountSectionProps) {
  const hasBreakdown =
    showBreakdown &&
    originalAmount != null &&
    originalAmount > BigInt(0) &&
    vettingFeeAmount != null &&
    vettingFeeAmount > BigInt(0);

  const isDeposit = activityType === "DEPOSIT" || activityType === "CROSSCHAIN_DEPOSIT";

  if (hasBreakdown) {
    return (
      <SectionCard title="Deposit Breakdown" headerClassName="px-0 py-1" className="p-2">
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-app-secondary text-xs">Original Amount:</span>
            <span className="text-app-primary text-xs font-semibold tabular-nums">
              {formatEthAmount(originalAmount!)} ETH
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-app-secondary text-xs">Vetting Fee:</span>
            <span className="text-xs font-semibold tabular-nums text-red-500">
              -{formatEthAmount(vettingFeeAmount!)} ETH
            </span>
          </div>

          <div className="border-app-border my-1 border-t" />

          <div className="flex items-center justify-between">
            <span className="text-app-secondary text-xs font-medium">Final Amount:</span>
            <span className="text-app-primary text-lg font-bold tabular-nums">
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
        <p className="text-app-secondary mb-1 text-sm font-medium">Amount</p>
        <p className="text-app-primary text-2xl font-bold tabular-nums">
          {amount !== null ? `${formatEthAmount(amount)} ETH` : "0 ETH"}
        </p>
        {isDeposit && <p className="text-app-tertiary mt-0.5 text-xs">After vetting fees</p>}
      </div>
    </SectionCard>
  );
}
