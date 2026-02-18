/**
 * Activity Details Screen Component
 *
 * Clean, focused view of activity details.
 * Uses Activity fields directly for display.
 */

import { ArrowRight, ChevronRight } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import type { ActivityItem } from "@shinobi-cash/data";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { CopyableText } from "@/components/shared/CopyableText";
import { ACTIVITY_TYPE_LABELS, type ActivityEntry } from "@/types/activity";
import { getTxExplorerUrl, getChainName } from "@/config/chains";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";

interface ActivityDetailsScreenProps {
  entry: ActivityEntry | null;
  onBack: () => void;
  onViewNoteChain?: (depositIndex: number) => void;
}

// Helper to safely get fee values
function getActivityFees(activity: ActivityItem) {
  const fees: { vetting?: string; relay?: string; solver?: string } = {};

  // Vetting fee (deposits only)
  if ("vettingFeeAmount" in activity && activity.vettingFeeAmount) {
    fees.vetting = activity.vettingFeeAmount;
  }

  // Relay fee (withdrawals only)
  if ("relayFee" in activity && activity.relayFee) {
    fees.relay = activity.relayFee;
  }

  // Solver fee (cross-chain intents)
  if ("solverFee" in activity && activity.solverFee) {
    fees.solver = activity.solverFee;
  }

  return fees;
}

// Helper to check if activity is a pending intent
function isPendingIntent(activity: ActivityItem): boolean {
  return (
    activity.type === "CROSSCHAIN_DEPOSIT_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAW_INTENT" ||
    activity.type === "CROSSCHAIN_WITHDRAW_2_INTENT"
  );
}

// Helper to get destination chain ID if applicable
function getDestinationChainId(activity: ActivityItem): string | null {
  if ("destinationChainId" in activity) {
    return activity.destinationChainId;
  }
  return null;
}

// Helper to get recipient if applicable
function getRecipient(activity: ActivityItem): string | null {
  if ("recipient" in activity) {
    return activity.recipient;
  }
  return null;
}

// Helper to get label if applicable
function getLabel(activity: ActivityItem): string | null {
  if ("label" in activity) {
    return activity.label;
  }
  return null;
}

// Helper to get ASP status if applicable
function getAspStatus(activity: ActivityItem): string | null {
  if ("aspStatus" in activity) {
    return activity.aspStatus;
  }
  return null;
}

export function ActivityDetailsScreen({
  entry,
  onBack,
  onViewNoteChain,
}: ActivityDetailsScreenProps) {
  if (!entry) return null;

  const { activity, type, displayAmount, isCrossChain, displayTimestamp } = entry;

  // Origin is always the activity's chain
  const originChainId = activity.chainId;
  const originChain = getChainName(originChainId);

  // Destination may or may not exist
  const destChainId = getDestinationChainId(activity) ?? originChainId;
  const destChain = getChainName(destChainId);

  // Check if we have fees to show
  const fees = getActivityFees(activity);
  const hasFees = Object.values(fees).some((f) => f && BigInt(f) > BigInt(0));

  // Check for pending intent status
  const isPending = isPendingIntent(activity);

  // Get optional fields
  const recipient = getRecipient(activity);
  const label = getLabel(activity);
  const aspStatus = getAspStatus(activity);

  return (
    <ScreenLayout
      header={<ScreenHeader title={ACTIVITY_TYPE_LABELS[type]} onBack={onBack} />}
      containerClassName="flex-1 sm:flex-none sm:h-[600px] w-full"
      contentClassName="px-4 py-4 overflow-y-auto"
      footer={
        onViewNoteChain ? (
          <Button
            onClick={() => onViewNoteChain?.(0)} // TODO: Get deposit index from activity
            className="h-12 w-full rounded-xl text-base font-semibold"
            size="lg"
          >
            View Note Chain
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Amount Card */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="text-center">
            <AmountDisplay
              amount={displayAmount}
              layout="stacked"
              ethOptions={{ maxDecimals: 6 }}
              ethClassName="text-3xl font-bold tabular-nums text-white"
              usdClassName="text-sm text-neutral-400 mt-1"
            />
          </div>
        </div>

        {/* Transaction Info */}
        <Section title="Transaction">
          <Row label="Time" value={formatTimestamp(displayTimestamp)} />
          <Row
            label="Chain"
            value={
              isCrossChain ? (
                <span className="flex items-center gap-1">
                  <a
                    href={getTxExplorerUrl(originChainId, activity.txHash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    {originChain}
                  </a>
                  <ArrowRight className="h-3 w-3 text-neutral-500" />
                  <span className="text-neutral-400">{destChain}</span>
                </span>
              ) : (
                <a
                  href={getTxExplorerUrl(originChainId, activity.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {originChain}
                </a>
              )
            }
          />
          {type === "deposit" && activity.user && (
            <Row label="Depositor" value={<CopyableText text={activity.user} />} />
          )}
          {type === "withdrawal" && recipient && (
            <Row label="Recipient" value={<CopyableText text={recipient} />} />
          )}
        </Section>

        {/* Fees (if any) */}
        {hasFees && (
          <Section title="Fees">
            {fees.vetting && BigInt(fees.vetting) > BigInt(0) && (
              <Row
                label="Compliance"
                value={
                  <span className="text-orange-400">
                    -{formatEthAmount(fees.vetting, { maxDecimals: 6 })} ETH
                  </span>
                }
              />
            )}
            {fees.relay && BigInt(fees.relay) > BigInt(0) && (
              <Row
                label="Relay"
                value={
                  <span className="text-orange-400">
                    -{formatEthAmount(fees.relay, { maxDecimals: 6 })} ETH
                  </span>
                }
              />
            )}
            {fees.solver && BigInt(fees.solver) > BigInt(0) && (
              <Row
                label="Solver"
                value={
                  <span className="text-orange-400">
                    -{formatEthAmount(fees.solver, { maxDecimals: 6 })} ETH
                  </span>
                }
              />
            )}
          </Section>
        )}

        {/* Activity Info */}
        <Section title="Activity">
          <Row label="Type" value={<span className="capitalize">{activity.type.toLowerCase().replace(/_/g, " ")}</span>} />
          <Row label="Pool" value={<CopyableText text={activity.pool} />} />
          {label && (
            <Row
              label="Label"
              value={<CopyableText text={label} truncateStart={10} truncateEnd={8} />}
            />
          )}
          {isPending && (
            <Row
              label="Intent Status"
              value={
                <span className="capitalize text-yellow-400">
                  Pending
                </span>
              }
            />
          )}
          {aspStatus && aspStatus !== "approved" && (
            <Row
              label="ASP Status"
              value={
                <span className="capitalize text-blue-400">
                  {aspStatus}
                </span>
              }
            />
          )}
        </Section>
      </div>
    </ScreenLayout>
  );
}
