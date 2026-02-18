import type { ActivityItem, TimelineEvent } from "@shinobi-cash/data";
import {
  isDeposit,
  isCrosschainDepositFill,
  isCrosschainDepositIntent,
  isWithdraw,
  isWithdraw2,
  isCrosschainWithdrawIntent,
  isCrosschainWithdraw2Intent,
  isCrosschainWithdrawalFill,
  isRagequit,
  isCrossChain,
} from "@shinobi-cash/data";
import { formatEthAmount, formatHash, formatTimestamp } from "@/utils/formatters";
import { ActivityStatusBadge } from "./ActivityStatusBadge";
import { FlowRow } from "@/components/shared/FlowRow";
import { ChainLink } from "@/components/shared/ChainLink";
import { HashField } from "@/components/shared/HashField";
import { DetailField } from "@/components/shared/DetailField";
import { CopyableText } from "@/components/shared/CopyableText";
import { ExternalLink, Check, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getChainName, getTxExplorerUrl } from "@/config/chains";

interface Props {
  activity: ActivityItem;
  timeline?: readonly TimelineEvent[] | null;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAW: "Withdrawal",
  WITHDRAW_2: "Withdrawal (2:1 Merge)",
  CROSSCHAIN_DEPOSIT_INTENT: "Cross-chain Deposit (Intent)",
  CROSSCHAIN_DEPOSIT_FILL: "Cross-chain Deposit",
  CROSSCHAIN_DEPOSIT_REFUND: "Cross-chain Deposit (Refund)",
  CROSSCHAIN_WITHDRAW_INTENT: "Cross-chain Withdrawal (Intent)",
  CROSSCHAIN_WITHDRAW_2_INTENT: "Cross-chain Withdrawal (2:1 Merge, Intent)",
  CROSSCHAIN_WITHDRAWAL_FILL: "Cross-chain Withdrawal",
  CROSSCHAIN_WITHDRAWAL_REFUND: "Cross-chain Withdrawal (Refund)",
  RAGEQUIT: "Ragequit",
};

const TIMELINE_TYPE_LABELS: Record<string, string> = {
  CROSSCHAIN_DEPOSIT_INTENT: "Intent Created",
  CROSSCHAIN_DEPOSIT_FILL: "Deposit Filled",
  CROSSCHAIN_DEPOSIT_REFUND: "Deposit Refunded",
  CROSSCHAIN_WITHDRAW_INTENT: "Intent Created",
  CROSSCHAIN_WITHDRAW_2_INTENT: "Intent Created",
  CROSSCHAIN_WITHDRAWAL_FILL: "Withdrawal Filled",
  CROSSCHAIN_WITHDRAWAL_REFUND: "Withdrawal Refunded",
};

function TimelineEventIcon({ type, isLast }: { type: string; isLast: boolean }) {
  const isRefund = type.includes("REFUND");
  const isFill = type.includes("FILL");
  const isIntent = type.includes("INTENT");

  if (isRefund) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500/20 text-red-400">
        <AlertCircle className="h-3 w-3" />
      </div>
    );
  }

  if (isFill || isLast) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
        <Check className="h-3 w-3" />
      </div>
    );
  }

  if (isIntent) {
    return (
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/20 text-blue-400">
        <Clock className="h-3 w-3" />
      </div>
    );
  }

  return (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-neutral-500">
      <div className="h-2 w-2 rounded-full bg-current" />
    </div>
  );
}

export function ActivityDetailsContent({ activity, timeline }: Props) {
  // Determine activity category
  const isDepositActivity =
    isDeposit(activity) ||
    isCrosschainDepositIntent(activity) ||
    isCrosschainDepositFill(activity);
  const isWithdrawalActivity =
    isWithdraw(activity) ||
    isWithdraw2(activity) ||
    isCrosschainWithdrawIntent(activity) ||
    isCrosschainWithdraw2Intent(activity) ||
    isCrosschainWithdrawalFill(activity);
  const isCrossChainActivity = isCrossChain(activity);
  const isCrossChainIntent =
    isCrosschainDepositIntent(activity) ||
    isCrosschainWithdrawIntent(activity) ||
    isCrosschainWithdraw2Intent(activity);
  const isRagequitActivity = isRagequit(activity);

  // ASP status is only relevant for deposits
  const aspStatus = "aspStatus" in activity ? activity.aspStatus : null;
  const showAspStatus = isDepositActivity && aspStatus;

  // Fee calculations
  const amount = activity.amount ? BigInt(activity.amount) : null;

  // For deposits
  const originalAmount = "originalAmount" in activity && activity.originalAmount
    ? BigInt(activity.originalAmount)
    : null;
  const vettingFee = "vettingFeeAmount" in activity && activity.vettingFeeAmount
    ? BigInt(activity.vettingFeeAmount)
    : BigInt(0);

  // For withdrawals
  const relayFee = "relayFee" in activity && activity.relayFee
    ? BigInt(activity.relayFee)
    : BigInt(0);
  const solverFee = "solverFee" in activity && activity.solverFee
    ? BigInt(activity.solverFee)
    : BigInt(0);

  // For withdrawals: net received by recipient
  const withdrawalNetReceived =
    isWithdrawalActivity && amount !== null ? amount - relayFee - solverFee : null;

  return (
    <div className="space-y-6 p-5">
      {/* Header: Type & Amount */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
            {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
          </span>
          {showAspStatus && <ActivityStatusBadge status={aspStatus} />}
          {isRagequitActivity && (
            <span className="rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-medium text-rose-400">
              Emergency Exit
            </span>
          )}
          {isCrossChainIntent && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
              Awaiting Fill
            </span>
          )}
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
          {isDepositActivity || isRagequitActivity ? "+" : "−"}
          {formatEthAmount(activity.amount, { decimals: 6 })} ETH
        </p>
        {isCrossChainIntent && (
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
          <DetailField label="Time">{formatTimestamp(activity.timestamp)}</DetailField>
          {isCrossChainActivity && "orderId" in activity && activity.orderId && (
            <DetailField label="Order ID">
              <span className="flex items-center gap-2">
                <CopyableText
                  value={activity.orderId}
                  displayValue={formatHash(activity.orderId)}
                  className="font-mono"
                />
                <Link
                  href={`/intents?orderId=${activity.orderId}`}
                  className="rounded p-1 text-neutral-400 transition hover:bg-white/10 hover:text-orange-400"
                  title="View Intent Details"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </span>
            </DetailField>
          )}
        </div>
      </section>

      {/* Timeline for cross-chain activities */}
      {isCrossChainActivity && timeline && timeline.length > 0 && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Timeline
          </p>
          <div className="rounded-xl bg-white/5 p-4">
            <div className="relative space-y-4">
              {timeline.map((event, index) => {
                const isLast = index === timeline.length - 1;
                return (
                  <div key={event.txHash} className="relative flex gap-3">
                    {/* Vertical line */}
                    {!isLast && (
                      <div className="absolute left-3 top-6 h-[calc(100%+0.5rem)] w-px -translate-x-1/2 bg-white/10" />
                    )}

                    {/* Icon */}
                    <div className="relative z-10">
                      <TimelineEventIcon type={event.type} isLast={isLast} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {TIMELINE_TYPE_LABELS[event.type] ?? event.type}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs">
                        <a
                          href={getTxExplorerUrl(event.chainId, event.txHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-neutral-300 transition-colors hover:text-orange-400"
                        >
                          {getChainName(event.chainId)}
                          <span className="text-neutral-500">↗</span>
                        </a>
                        <span className="text-neutral-400">{formatTimestamp(event.timestamp)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Fund Flow - Deposits */}
      {isDepositActivity && (
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

          {/* Solver Fee (crosschain) */}
          {isCrossChainActivity && solverFee > BigInt(0) && (
            <FlowRow
              label="To"
              role="Solver"
              address={"solver" in activity && activity.solver ? activity.solver : "Pending fill"}
              amount={solverFee}
              direction="in"
              feeType="Solver Fee"
            />
          )}

          {/* Vetting Fee */}
          {"vettingFeeRecipient" in activity && activity.vettingFeeRecipient && vettingFee > BigInt(0) && (
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
            address={activity.pool}
            amount={amount}
            direction="in"
            highlight
          />
        </section>
      )}

      {/* Fund Flow - Withdrawals */}
      {isWithdrawalActivity && amount && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
            Fund Flow
          </p>
          {/* Source: Pool */}
          <FlowRow
            label="From"
            role="Pool"
            address={activity.pool}
            amount={amount}
            direction="out"
          />

          {/* Arrow */}
          <div className="flex items-center gap-2 pl-4 text-neutral-500">
            <span>↓</span>
            <span className="text-xs">distributed to</span>
          </div>

          {/* Solver Fee (crosschain) */}
          {isCrossChainActivity && solverFee > BigInt(0) && (
            <FlowRow
              label="To"
              role="Solver"
              address={"solver" in activity && activity.solver ? activity.solver : "Pending fill"}
              amount={solverFee}
              direction="in"
              feeType="Solver Fee"
            />
          )}

          {/* Relay Fee */}
          {"relayer" in activity && activity.relayer && relayFee > BigInt(0) && (
            <FlowRow
              label="To"
              role="Relayer"
              address={activity.relayer}
              amount={relayFee}
              direction="in"
              feeType="Relay Fee"
            />
          )}

          {/* Recipient */}
          {"recipient" in activity && activity.recipient && withdrawalNetReceived !== null && (
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
      {isRagequitActivity && amount && (
        <section className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-wider text-rose-400">
            Emergency Exit - No Fees
          </p>
          {/* Source: Pool */}
          <FlowRow
            label="From"
            role="Pool"
            address={activity.pool}
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
          label="Chain"
          chainId={activity.chainId}
          txHash={activity.txHash}
        />
        {isCrosschainDepositIntent(activity) && activity.destinationChainId && (
          <ChainLink
            label="Destination Chain"
            chainId={activity.destinationChainId}
          />
        )}
      </section>

      {/* Cryptographic Details */}
      <section className="space-y-3">
        <p className="text-xs font-medium uppercase tracking-wider text-neutral-500">
          Cryptographic Details
        </p>

        {/* Deposits: Commitment, Precommitment, Label */}
        {isDepositActivity && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {"commitment" in activity && activity.commitment && (
              <HashField label="Commitment" value={activity.commitment} />
            )}
            {"precommitment" in activity && activity.precommitment && (
              <HashField label="Precommitment" value={activity.precommitment} />
            )}
            {"label" in activity && activity.label && (
              <HashField label="Label" value={activity.label} />
            )}
          </div>
        )}

        {/* Withdrawals: Change Commitment, Refund Commitment */}
        {isWithdrawalActivity && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {"newCommitment" in activity && activity.newCommitment && (
              <HashField label="Change Commitment" value={activity.newCommitment} />
            )}
            {"refundCommitment" in activity && activity.refundCommitment && (
              <HashField label="Refund Commitment" value={activity.refundCommitment} />
            )}
          </div>
        )}

        {/* Ragequit: Commitment */}
        {isRagequitActivity && (
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {"commitment" in activity && (
              <HashField label="Commitment" value={activity.commitment} />
            )}
          </div>
        )}
      </section>
    </div>
  );
}
