import type { Activity } from "@shinobi-cash/data";
import {
  isDepositActivity,
  isWithdrawalActivity,
  isWithdraw2Activity,
  isCrossChainDepositActivity,
  isCrossChainWithdrawalActivity,
  isCrossChainWithdraw2Activity,
  isCrossChainDepositPendingActivity,
  isCrossChainWithdrawalPendingActivity,
  isCrossChainWithdraw2PendingActivity,
  isRagequitActivity,
  isAnyCrossChainActivity,
} from "@shinobi-cash/data";
import { formatEthAmount, formatHash, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusBadge } from "@/components/explorer/ActivityStatusBadge";
import { FlowRow } from "@/components/explorer/FlowRow";
import { ChainLink } from "@/components/explorer/ChainLink";
import { HashField } from "@/components/explorer/HashField";
import { DetailField } from "@/components/explorer/DetailField";
import { CopyableText } from "@/components/explorer/CopyableText";

interface Props {
  activity: Activity;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  WITHDRAW2: "Withdrawal (2:1 Merge)",
  CROSSCHAIN_DEPOSIT: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAWAL: "Cross-chain Withdrawal",
  CROSSCHAIN_WITHDRAW2: "Cross-chain Withdrawal (2:1 Merge)",
  CROSSCHAIN_DEPOSIT_PENDING: "Cross-chain Deposit (Pending)",
  CROSSCHAIN_WITHDRAWAL_PENDING: "Cross-chain Withdrawal (Pending)",
  CROSSCHAIN_WITHDRAW2_PENDING: "Cross-chain Withdrawal (2:1 Merge, Pending)",
  RAGEQUIT: "Ragequit",
};

const INTENT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  filled: "Filled",
  refunded: "Refunded",
};

export function ActivityDetailsContent({ activity }: Props) {
  const isDeposit =
    isDepositActivity(activity) ||
    isCrossChainDepositActivity(activity) ||
    isCrossChainDepositPendingActivity(activity);
  const isWithdrawal =
    isWithdrawalActivity(activity) ||
    isWithdraw2Activity(activity) ||
    isCrossChainWithdrawalActivity(activity) ||
    isCrossChainWithdraw2Activity(activity) ||
    isCrossChainWithdrawalPendingActivity(activity) ||
    isCrossChainWithdraw2PendingActivity(activity);
  const isCrossChain = isAnyCrossChainActivity(activity);
  const isRagequit = isRagequitActivity(activity);
  const isPending =
    isCrossChainDepositPendingActivity(activity) ||
    isCrossChainWithdrawalPendingActivity(activity);

  // ASP status is only relevant for deposits
  const showAspStatus = isDeposit && activity.aspStatus;

  // Intent status is only relevant for cross-chain activities
  const showIntentStatus = isCrossChain && activity.intentStatus;

  // Fee calculations
  const originalAmount = activity.originalAmount ? BigInt(activity.originalAmount) : null;
  const amount = activity.amount ? BigInt(activity.amount) : null;
  const vettingFee = activity.vettingFeeAmount ? BigInt(activity.vettingFeeAmount) : BigInt(0);
  const solverFee = activity.solverFeeAmount ? BigInt(activity.solverFeeAmount) : BigInt(0);
  const relayFee = activity.relayFeeAmount ? BigInt(activity.relayFeeAmount) : BigInt(0);
  const paymasterRefund = activity.paymasterFeeRefund
    ? BigInt(activity.paymasterFeeRefund)
    : BigInt(0);

  // Net relay fee after refund (for sponsored withdrawals)
  const netRelayFee = relayFee - paymasterRefund;

  // For withdrawals: net received by recipient
  const withdrawalNetReceived =
    isWithdrawal && amount !== null ? amount - netRelayFee - solverFee : null;

  return (
    <div className="space-y-6 p-5">
      {/* Header: Type & Amount */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
            {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
          </span>
          {showAspStatus && <ActivityStatusBadge status={activity.aspStatus} />}
          {isRagequit && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400">
              Emergency Exit
            </span>
          )}
          {isPending && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
              Awaiting Fill
            </span>
          )}
          {activity.isSponsored && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
              Sponsored
            </span>
          )}
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
          {isDeposit || isRagequit ? "+" : "−"}
          {formatEthAmount(activity.amount, { decimals: 6 })} ETH
        </p>
        {isPending && (
          <p className="mt-1 text-sm text-neutral-400">
            Amount will be finalized when solver fills the intent
          </p>
        )}
      </section>

      {/* Status & Metadata */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Status & Metadata
        </p>
        <div className="flex flex-wrap gap-6">
        {showIntentStatus && (
          <DetailField label="Intent Status">
            <span className="capitalize">
              {INTENT_STATUS_LABELS[activity.intentStatus!] ?? activity.intentStatus}
            </span>
          </DetailField>
        )}
        <DetailField label="Time">{formatTimestamp(activity.timestamp)}</DetailField>
        {isCrossChain && activity.orderId && (
          <DetailField label="Order ID">
            <CopyableText
              value={activity.orderId}
              displayValue={formatHash(activity.orderId)}
              className="font-mono"
            />
          </DetailField>
        )}
        </div>
      </section>

      {/* Fund Flow - Deposits */}
      {isDeposit && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Fund Flow
          </p>
            {/* Source: User */}
            {activity.user && (
              <FlowRow
                label="From"
                role="Depositor"
                address={activity.user}
                amount={originalAmount || amount}
                direction="out"
              />
            )}

            {/* Arrow */}
            <div className="flex items-center gap-2 pl-4 text-neutral-500">
              <span>↓</span>
              <span className="text-xs">distributed to</span>
            </div>

            {/* Solver Fee (crosschain only) */}
            {isCrossChain && activity.solver && solverFee > BigInt(0) && (
              <FlowRow
                label="To"
                role="Solver"
                address={activity.solver}
                amount={solverFee}
                direction="in"
                feeType="Solver Fee"
              />
            )}

            {/* Vetting Fee */}
            {activity.vettingFeeRecipient && vettingFee > BigInt(0) && (
              <FlowRow
                label="To"
                role="Entrypoint"
                address={activity.vettingFeeRecipient}
                amount={vettingFee}
                direction="in"
                feeType="Vetting Fee"
              />
            )}

            {/* Pool */}
            <FlowRow
              label="To"
              role="Pool"
              address={activity.poolId}
              amount={amount}
              direction="in"
              highlight
            />
        </section>
      )}

      {/* Fund Flow - Withdrawals */}
      {isWithdrawal && amount && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Fund Flow
          </p>
            {/* Source: Pool */}
            <FlowRow
              label="From"
              role="Pool"
              address={activity.poolId}
              amount={amount}
              direction="out"
            />

            {/* Arrow */}
            <div className="flex items-center gap-2 pl-4 text-neutral-500">
              <span>↓</span>
              <span className="text-xs">distributed to</span>
            </div>

            {/* Solver Fee (crosschain only) */}
            {isCrossChain && activity.solver && solverFee > BigInt(0) && (
              <FlowRow
                label="To"
                role="Solver"
                address={activity.solver}
                amount={solverFee}
                direction="in"
                feeType="Solver Fee"
              />
            )}

            {/* Relay Fee */}
            {activity.relayer && relayFee > BigInt(0) && (
              <FlowRow
                label="To"
                role="Relayer"
                address={activity.relayer}
                amount={netRelayFee}
                direction="in"
                feeType="Relay Fee"
              />
            )}

            {/* Recipient */}
            {activity.recipient && withdrawalNetReceived !== null && (
              <FlowRow
                label="To"
                role="Recipient"
                address={activity.recipient}
                amount={withdrawalNetReceived}
                direction="in"
                highlight
              />
            )}
        </section>
      )}

      {/* Fund Flow - Ragequit */}
      {isRagequit && amount && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-400">
            Emergency Exit - No Fees
          </p>
            {/* Source: Pool */}
            <FlowRow
              label="From"
              role="Pool"
              address={activity.poolId}
              amount={amount}
              direction="out"
            />

            {/* Arrow */}
            <div className="flex items-center gap-2 pl-4 text-neutral-500">
              <span>↓</span>
              <span className="text-xs">full amount returned</span>
            </div>

            {/* User */}
            {activity.user && (
              <FlowRow
                label="To"
                role="Ragequitter"
                address={activity.user}
                amount={amount}
                direction="in"
                highlight
              />
            )}
        </section>
      )}

      {/* Chain & Transaction */}
      <section className="flex flex-wrap gap-6">
        <ChainLink
          label={isCrossChain ? "Origin Chain" : "Chain"}
          chainId={activity.originChainId}
          txHash={activity.originTransactionHash}
        />
        {isCrossChain && activity.destinationChainId && (
          <ChainLink
            label="Destination Chain"
            chainId={activity.destinationChainId}
            txHash={activity.destinationTransactionHash}
          />
        )}
      </section>

      {/* Cryptographic Details */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Cryptographic Details
        </p>

        {/* Deposits: Commitment, Precommitment, Label */}
        {isDeposit && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <HashField label="Commitment" value={activity.commitment} />
            {activity.precommitmentHash && (
              <HashField label="Precommitment" value={activity.precommitmentHash} />
            )}
            {activity.label && <HashField label="Label" value={activity.label} />}
          </div>
        )}

        {/* Withdrawals: Nullifier(s), Change Commitment, Refund Commitment */}
        {isWithdrawal && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {activity.spentNullifier && (
              <HashField
                label={activity.spentNullifier1 ? "Spent Nullifier 1" : "Spent Nullifier"}
                value={activity.spentNullifier}
              />
            )}
            {activity.spentNullifier1 && (
              <HashField label="Spent Nullifier 2" value={activity.spentNullifier1} />
            )}
            {activity.newCommitment && (
              <HashField label="Change Commitment" value={activity.newCommitment} />
            )}
            {activity.refundCommitment && (
              <HashField label="Refund Commitment" value={activity.refundCommitment} />
            )}
          </div>
        )}

        {/* Ragequit: Commitment */}
        {isRagequit && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            <HashField label="Commitment" value={activity.commitment} />
          </div>
        )}
      </section>
    </div>
  );
}
