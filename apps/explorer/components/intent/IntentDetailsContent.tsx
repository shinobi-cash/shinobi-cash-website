"use client";

import type { Intent } from "@shinobi-cash/data";
import { useIntentDetails } from "@/hooks/data/useIntentDetails";
import { formatEthAmount, formatHash } from "@/utils/formatters";
import { getChainName, getTxExplorerUrl } from "@/config/chains";
import { CopyableText } from "../explorer/CopyableText";
import { IntentTimeline } from "./IntentTimeline";
import { ExternalLink, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  intent: Intent;
}

export function IntentDetailsContent({ intent }: Props) {
  const { data: details, isLoading, error } = useIntentDetails(intent.orderId);

  const isDeposit = intent.intentType === "DEPOSIT";
  const originChain = intent.originChainId ? getChainName(Number(intent.originChainId)) : "Unknown";
  const destChain = intent.destinationChainId ? getChainName(Number(intent.destinationChainId)) : "Pool Chain";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            {isDeposit ? "Deposit" : "Withdrawal"} Intent
          </h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${
              intent.phase === "FINALIZED"
                ? "bg-emerald-500/20 text-emerald-400"
                : intent.phase === "REFUNDED"
                  ? "bg-red-500/20 text-red-400"
                  : "bg-blue-500/20 text-blue-400"
            }`}
          >
            {intent.phase.toLowerCase()}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
          <span>{originChain}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{destChain}</span>
        </div>
      </div>

      {/* Amount */}
      {intent.amount && (
        <div className="rounded-xl bg-white/5 p-4">
          <div className="text-xs text-neutral-500">Amount</div>
          <div
            className={`mt-1 text-2xl font-bold tabular-nums ${
              isDeposit ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {isDeposit ? "+" : "−"}
            {formatEthAmount(intent.amount, { decimals: 6 })} ETH
          </div>
        </div>
      )}

      {/* Details */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neutral-400">Details</h4>

        <div className="space-y-2 rounded-xl bg-white/5 p-4">
          {/* Order ID */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Order ID</span>
            <CopyableText
              value={intent.orderId}
              displayValue={formatHash(intent.orderId)}
              className="font-mono text-xs text-neutral-300"
            />
          </div>

          {/* User */}
          {intent.user && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">User</span>
              <CopyableText
                value={intent.user}
                displayValue={formatHash(intent.user)}
                className="font-mono text-xs text-neutral-300"
              />
            </div>
          )}

          {/* Solver */}
          {intent.solver && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Solver</span>
              <CopyableText
                value={intent.solver}
                displayValue={formatHash(intent.solver)}
                className="font-mono text-xs text-neutral-300"
              />
            </div>
          )}

          {/* Latest Tx */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-500">Latest Tx</span>
            <a
              href={getTxExplorerUrl(intent.originChainId ?? 421614, intent.txHash)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 font-mono text-xs text-blue-400 hover:text-blue-300"
            >
              {formatHash(intent.txHash)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neutral-400">Timeline</h4>

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">Failed to load timeline</p>
          </div>
        )}

        {details?.timeline && (
          <div className="rounded-xl bg-white/5 p-4">
            <IntentTimeline events={details.timeline} currentPhase={intent.phase} />
          </div>
        )}
      </div>
    </div>
  );
}
