import type { Activity } from "@shinobi-cash/data";
import { formatEthAmount, formatHash, formatTimestamp } from "@/utils/formatters";
import { getTxExplorerUrl } from "@/config/chains";
import { ActivityStatusBadge } from "@/components/explorer/ActivityStatusBadge";

interface Props {
  activity: Activity;
}

export function ActivityDetailsContent({ activity }: Props) {
  const isDeposit = activity.type === "DEPOSIT" || activity.type === "CROSSCHAIN_DEPOSIT";

  const isWithdrawal = activity.type === "WITHDRAWAL" || activity.type === "CROSSCHAIN_WITHDRAWAL";

  const crossChain =
    activity.destinationChainId !== null && activity.originChainId !== activity.destinationChainId;

  return (
    <div className="space-y-6 p-5">
      {/* Amount */}
      <section>
        <p className="text-xs text-neutral-400">Amount</p>
        <p className="mt-1 text-3xl font-semibold tabular-nums text-white">
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
      {activity.aspStatus && (
        <section>
          <p className="text-xs text-neutral-400">Status</p>
          <div className="mt-1">
            <ActivityStatusBadge status={activity.aspStatus} />
          </div>
        </section>
      )}

      {/* Timing */}
      <section>
        <p className="text-xs text-neutral-400">Time</p>
        <p className="mt-1 text-sm text-white">{formatTimestamp(activity.timestamp)}</p>
      </section>

      {/* Transactions */}
      <section className="space-y-3">
        <p className="text-xs text-neutral-400">Transactions</p>

        {!crossChain && activity.originTransactionHash && (
          <DetailLink
            label="Transaction"
            value="View on explorer"
            href={getTxExplorerUrl(
              activity.originChainId!.toString(),
              activity.originTransactionHash
            )}
          />
        )}

        {crossChain && (
          <>
            {activity.originTransactionHash && (
              <DetailLink
                label="Origin"
                value={formatHash(activity.originTransactionHash)}
                href={getTxExplorerUrl(
                  activity.originChainId!.toString(),
                  activity.originTransactionHash
                )}
              />
            )}

            {activity.destinationTransactionHash && (
              <DetailLink
                label="Destination"
                value={formatHash(activity.destinationTransactionHash)}
                href={getTxExplorerUrl(
                  activity.destinationChainId!.toString(),
                  activity.destinationTransactionHash
                )}
              />
            )}
          </>
        )}
      </section>

      {/* Recipient */}
      {isWithdrawal && activity.recipient && (
        <section>
          <p className="text-xs text-neutral-400">Recipient</p>
          <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.recipient)}</p>
        </section>
      )}

      {/* Pool */}
      <section>
        <p className="text-xs text-neutral-400">Pool</p>
        <p className="mt-1 font-mono text-sm text-white">{formatHash(activity.poolId)}</p>
      </section>

      {/* Precommitment */}
      {activity.precommitmentHash && (
        <section>
          <p className="text-xs text-neutral-400">Precommitment</p>
          <p className="mt-1 font-mono text-sm text-white">
            {formatHash(activity.precommitmentHash)}
          </p>
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
