/**
 * Activity Details Screen Component
 *
 * Shows activity details with timeline for cross-chain and input/output breakdown.
 * Uses app's Section/Row design pattern.
 */

import { useRouter } from "next/navigation";
import { Clock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { useIntentDetails } from "@/hooks/useIntentDetails";
import { isIntentRefundable } from "@/utils/refund";
import type { ActivityDetailsScreenProps } from "./types";
import {
  isDepositActivity,
  isWithdrawalActivity,
  isMergedWithdrawalActivity,
  getActivityTitle,
  findCreatedNote,
  findWithdrawalNotes,
  getNewCommitment,
  getRefundCommitment,
} from "./utils";
import {
  DepositDetailsSection,
  WithdrawalInputSection,
  WithdrawalFeesSection,
  WithdrawalOutputSection,
  TransactionSection,
  CrosschainSection,
  CryptographicSection,
} from "./sections";

export type { ActivityDetailsScreenProps } from "./types";

export function ActivityDetailsScreen({
  entry,
  onBack,
  onViewNoteChain,
  allTrees = [],
}: ActivityDetailsScreenProps) {
  const router = useRouter();

  // Get orderId for refund check
  const entryOrderId = entry && "orderId" in entry.activity ? entry.activity.orderId : undefined;
  const { intent } = useIntentDetails(entryOrderId, {
    enabled: !!entry?.isCrossChain && !!entryOrderId,
  });
  const canRefund = intent ? isIntentRefundable(intent) : false;

  if (!entry) return null;

  const { activity, isCrossChain, displayTimestamp, timeline } = entry;

  // Activity type flags
  const isDeposit = isDepositActivity(activity);
  const isWithdrawal = isWithdrawalActivity(activity);
  const isMergedWithdrawal = isMergedWithdrawalActivity(activity, timeline);

  // Parse amounts
  const amount = activity.amount ? BigInt(activity.amount) : null;
  const relayFee =
    "relayFee" in activity && activity.relayFee ? BigInt(activity.relayFee) : BigInt(0);
  const solverFee =
    "solverFee" in activity && activity.solverFee ? BigInt(activity.solverFee) : BigInt(0);
  const vettingFee =
    "vettingFeeAmount" in activity && activity.vettingFeeAmount
      ? BigInt(activity.vettingFeeAmount)
      : BigInt(0);

  // Calculate totals
  const totalFees = relayFee + solverFee + vettingFee;
  const netAmount = amount && amount > totalFees ? amount - totalFees : BigInt(0);

  // Get optional fields
  const orderId = "orderId" in activity ? activity.orderId : null;
  const recipient = "recipient" in activity ? activity.recipient : null;
  const label = "label" in activity ? activity.label : null;
  const newCommitment = getNewCommitment(activity, isCrossChain, timeline);

  // Find notes
  const createdNote = findCreatedNote(label, allTrees);
  const { inputNotes, changeNote } = isWithdrawal
    ? findWithdrawalNotes(activity, isCrossChain, timeline, newCommitment, allTrees)
    : { inputNotes: [], changeNote: null };

  // Get cryptographic fields
  const commitment = "commitment" in activity ? activity.commitment : null;
  const precommitment = "precommitment" in activity ? activity.precommitment : null;
  const refundCommitment = getRefundCommitment(activity, timeline);

  return (
    <ScreenLayout
      header={
        <ScreenHeader
          title={getActivityTitle(activity, isMergedWithdrawal)}
          onBack={onBack}
        />
      }
      containerClassName="flex-1 sm:flex-none sm:h-[600px] w-full"
      contentClassName="px-4 py-4 overflow-y-auto"
      footer={
        canRefund && orderId ? (
          <div className="px-4 pb-4">
            <Button
              onClick={() => router.push(`/refund?orderId=${orderId}`)}
              className="h-12 w-full rounded-xl text-base font-semibold"
              size="lg"
            >
              <Clock className="mr-2 h-4 w-4" />
              Claim Refund
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Deposit Details */}
        {isDeposit && (
          <DepositDetailsSection
            user={activity.user ?? null}
            createdNote={createdNote}
            netAmount={netAmount}
            onViewNoteChain={onViewNoteChain}
          />
        )}

        {/* Same-chain deposit transaction */}
        {isDeposit && !isCrossChain && (
          <TransactionSection
            chainId={activity.chainId}
            txHash={activity.txHash}
            timestamp={displayTimestamp}
          />
        )}

        {/* Withdrawal - Input */}
        {isWithdrawal && amount && (
          <WithdrawalInputSection
            inputNotes={inputNotes}
            fallbackAmount={amount}
            isMergedWithdrawal={isMergedWithdrawal}
            onViewNoteChain={onViewNoteChain}
          />
        )}

        {/* Withdrawal - Fees */}
        {isWithdrawal && (
          <WithdrawalFeesSection relayFee={relayFee} solverFee={solverFee} />
        )}

        {/* Withdrawal - Output */}
        {isWithdrawal && (
          <WithdrawalOutputSection
            recipient={recipient ?? null}
            netAmount={netAmount}
            changeNote={changeNote}
            newCommitment={newCommitment}
            onViewNoteChain={onViewNoteChain}
          />
        )}

        {/* Same-chain withdrawal transaction */}
        {isWithdrawal && !isCrossChain && (
          <TransactionSection
            chainId={activity.chainId}
            txHash={activity.txHash}
            timestamp={displayTimestamp}
          />
        )}

        {/* Crosschain Details */}
        {isCrossChain && orderId && (
          <CrosschainSection orderId={orderId} timeline={timeline} />
        )}

        {/* Cryptographic Details */}
        <CryptographicSection
          commitment={commitment}
          precommitment={precommitment}
          label={label}
          newCommitment={newCommitment}
          refundCommitment={refundCommitment}
        />
      </div>
    </ScreenLayout>
  );
}
