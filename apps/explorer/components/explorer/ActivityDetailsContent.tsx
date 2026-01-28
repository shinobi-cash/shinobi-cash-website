import type { Activity } from "@shinobi-cash/data";
import { formatEthAmount, formatHash, formatTimestamp } from "@/utils/formatters";
import { getChainName, getTxExplorerUrl } from "@/config/chains";
import { ActivityStatusBadge } from "@/components/explorer/ActivityStatusBadge";

interface Props {
  activity: Activity;
}

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  DEPOSIT: "Deposit",
  WITHDRAWAL: "Withdrawal",
  CROSSCHAIN_DEPOSIT: "Cross-chain Deposit",
  CROSSCHAIN_WITHDRAWAL: "Cross-chain Withdrawal",
  CROSSCHAIN_DEPOSIT_PENDING: "Cross-chain Deposit (Pending)",
  CROSSCHAIN_WITHDRAWAL_PENDING: "Cross-chain Withdrawal (Pending)",
  RAGEQUIT: "Ragequit",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  filled: "Filled",
  refunded: "Refunded",
};

export function ActivityDetailsContent({ activity }: Props) {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";
  const isWithdrawal = activity.type === "WITHDRAWAL" || activity.type === "CROSSCHAIN_WITHDRAWAL";
  const crossChain =
    activity.destinationChainId !== null && activity.originChainId !== activity.destinationChainId;

  return (
    <div className="space-y-6 p-5">
      {/* Type & Amount Header */}
      <section>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
            {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
          </span>
        </div>
        <p className="mt-3 text-3xl font-semibold tabular-nums text-white">
          {isDeposit ? "+" : "−"}
          {formatEthAmount(activity.amount)} ETH
        </p>
        {isDeposit && activity.vettingFeeAmount && (
          <p className="mt-1 text-xs text-neutral-500">
            Includes vetting fee of {formatEthAmount(activity.vettingFeeAmount)} ETH
          </p>
        )}
      </section>

      {/* Status */}
      <section className="flex gap-6">
        <div>
          <p className="text-xs text-neutral-400">Status</p>
          <p className="mt-1 text-sm capitalize text-white">
            {STATUS_LABELS[activity.status] ?? activity.status}
          </p>
        </div>
        {activity.aspStatus && (
          <div>
            <p className="text-xs text-neutral-400">ASP Status</p>
            <div className="mt-1">
              <ActivityStatusBadge status={activity.aspStatus} />
            </div>
          </div>
        )}
      </section>

      {/* Chains */}
      <section className="flex gap-6">
        <div>
          <p className="text-xs text-neutral-400">{crossChain ? "Origin Chain" : "Chain"}</p>
          <p className="mt-1 text-sm text-white">{getChainName(activity.originChainId)}</p>
        </div>
        {crossChain && activity.destinationChainId && (
          <div>
            <p className="text-xs text-neutral-400">Destination Chain</p>
            <p className="mt-1 text-sm text-white">{getChainName(activity.destinationChainId)}</p>
          </div>
        )}
      </section>

      {/* Time */}
      <section>
        <p className="text-xs text-neutral-400">Time</p>
        <p className="mt-1 text-sm text-white">{formatTimestamp(activity.timestamp)}</p>
      </section>

      {/* User */}
      <section>
        <p className="text-xs text-neutral-400">User</p>
        <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.user)}</p>
      </section>

      {/* Recipient (for withdrawals) */}
      {isWithdrawal && activity.recipient && (
        <section>
          <p className="text-xs text-neutral-400">Recipient</p>
          <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.recipient)}</p>
        </section>
      )}

      {/* Transactions */}
      <section className="space-y-3">
        <p className="text-xs text-neutral-400">Transactions</p>

        {!crossChain && activity.originTransactionHash && (
          <DetailLink
            label="Transaction"
            value="View on explorer"
            href={getTxExplorerUrl(activity.originChainId.toString(), activity.originTransactionHash)}
          />
        )}

        {crossChain && (
          <>
            {activity.originTransactionHash && (
              <DetailLink
                label={`Origin (${getChainName(activity.originChainId)})`}
                value={formatHash(activity.originTransactionHash)}
                href={getTxExplorerUrl(activity.originChainId.toString(), activity.originTransactionHash)}
              />
            )}

            {activity.destinationTransactionHash && activity.destinationChainId && (
              <DetailLink
                label={`Destination (${getChainName(activity.destinationChainId)})`}
                value={formatHash(activity.destinationTransactionHash)}
                href={getTxExplorerUrl(activity.destinationChainId.toString(), activity.destinationTransactionHash)}
              />
            )}
          </>
        )}
      </section>

      {/* Fees */}
      {activity.feeAmount && (
        <section>
          <p className="text-xs text-neutral-400">Fee</p>
          <p className="mt-1 text-sm text-white">{formatEthAmount(activity.feeAmount)} ETH</p>
        </section>
      )}

      {/* Pool */}
      <section>
        <p className="text-xs text-neutral-400">Pool</p>
        <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.poolId)}</p>
      </section>

      {/* Commitment */}
      <section>
        <p className="text-xs text-neutral-400">Commitment</p>
        <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.commitment)}</p>
      </section>

      {/* Precommitment (for deposits) */}
      {activity.precommitmentHash && (
        <section>
          <p className="text-xs text-neutral-400">Precommitment</p>
          <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.precommitmentHash)}</p>
        </section>
      )}
    </div>
  );
}

function DetailLink({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white/3 hover:bg-white/6 flex items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm"
    >
      <span className="text-neutral-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </a>
  );
}
