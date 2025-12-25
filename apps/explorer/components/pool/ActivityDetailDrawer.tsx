/**
 * Activity Detail Drawer (Refactored)
 * Displays detailed information about an activity
 * Refactored to follow Single Responsibility Principle
 */

import { Button } from "@workspace/ui/components/button";
import type { Activity } from "@shinobi-cash/data";
import { ResponsiveModal } from "../../ui/responsive-modal";
import { SectionCard, DetailRow, CopyableField, ExternalLink } from "@/components/shared";
import { AmountSection } from "@/components/shared/activity/AmountSection";
import { CrossChainFlowSection } from "@/components/shared/activity/CrossChainFlowSection";
import { ActivityStatusBadge } from "@/components/shared/activity/ActivityStatusBadge";
import { formatHash, formatTimestamp, formatEthAmount } from "@/utils/formatters";
import { getTxExplorerUrl } from "@/config/chains";

interface ActivityDetailDrawerProps {
  activity: Activity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Check if activity is cross-chain
 */
const isCrossChain = (activity: Activity): boolean => {
  return !!(
    activity.destinationChainId !== null && activity.originChainId !== activity.destinationChainId
  );
};

export const ActivityDetailDrawer = ({
  activity,
  open,
  onOpenChange,
}: ActivityDetailDrawerProps) => {
  if (!activity) return null;

  const crossChain = isCrossChain(activity);
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";
  const isWithdrawal = activity.type === "WITHDRAWAL" || activity.type === "CROSSCHAIN_WITHDRAWAL";

  const footerContent = (
    <div className="flex justify-center">
      <Button
        variant="outline"
        onClick={() => onOpenChange(false)}
        className="h-12 flex-1 rounded-xl text-base font-medium"
        size="lg"
      >
        Close
      </Button>
    </div>
  );

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={onOpenChange}
      title="Activity Details"
      className="bg-app-background border-app"
      showFooter={true}
      footerContent={footerContent}
    >
      <div className="space-y-2">
        {/* Amount Section */}
        <AmountSection
          amount={activity.amount}
          originalAmount={activity.originalAmount}
          vettingFeeAmount={activity.vettingFeeAmount}
          activityType={activity.type}
          showBreakdown={isDeposit}
        />

        {/* Cross-Chain Flow */}
        {crossChain && (
          <CrossChainFlowSection
            originChainId={activity.originChainId}
            originTxHash={activity.originTransactionHash}
            destinationChainId={activity.destinationChainId}
            destinationTxHash={activity.destinationTransactionHash}
          />
        )}

        {/* Details Section */}
        <SectionCard title="Details" className="overflow-hidden">
          <div className="divide-app-border divide-y">
            {/* Transaction Link (same-chain only) */}
            {!crossChain && activity.originChainId !== null && activity.originTransactionHash && (
              <DetailRow
                label="Transaction"
                value={
                  <ExternalLink
                    href={getTxExplorerUrl(
                      activity.originChainId.toString(),
                      activity.originTransactionHash
                    )}
                    className="font-mono text-xs"
                  >
                    View
                  </ExternalLink>
                }
              />
            )}

            {/* ASP Status (for deposits) */}
            {isDeposit && (
              <DetailRow
                label="ASP Status"
                value={<ActivityStatusBadge status={activity.aspStatus || "pending"} />}
              />
            )}

            {/* Timestamp */}
            <DetailRow label="Time" value={formatTimestamp(activity.timestamp.toString())} />

            {/* Recipient (withdrawals) */}
            {isWithdrawal && activity.recipient && (
              <div className="px-2 py-2">
                <CopyableField
                  label="Recipient"
                  value={activity.recipient}
                  displayValue={formatHash(activity.recipient)}
                />
              </div>
            )}

            {/* Withdrawal Status (cross-chain withdrawals) */}
            {isWithdrawal && crossChain && activity.aspStatus && (
              <DetailRow
                label="Status"
                value={<ActivityStatusBadge status={activity.aspStatus} />}
              />
            )}

            {/* Fee Information (withdrawals) */}
            {isWithdrawal && activity.feeAmount != null && (
              <DetailRow label="Fee Amount" value={`${formatEthAmount(activity.feeAmount)} ETH`} />
            )}
          </div>
        </SectionCard>

        {/* Pool Information */}
        <SectionCard title="Pool" className="overflow-hidden">
          <div className="px-2 py-2">
            <CopyableField
              label="Address"
              value={activity.poolId}
              displayValue={formatHash(activity.poolId)}
            />
          </div>
        </SectionCard>

        {/* Precommitment Hash */}
        {activity.precommitmentHash && (
          <SectionCard title="Precommitment">
            <div className="px-2 py-2">
              <CopyableField
                label="Hash"
                value={activity.precommitmentHash}
                displayValue={formatHash(activity.precommitmentHash)}
              />
            </div>
          </SectionCard>
        )}
      </div>
    </ResponsiveModal>
  );
};
