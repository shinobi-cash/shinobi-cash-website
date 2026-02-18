"use client";

import type { Intent } from "@shinobi-cash/data";
import type { IntentTimelineEvent } from "@/controllers/IntentExplorerController";
import { formatEthAmount, formatHash, bytes32ToAddress } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { CopyableText } from "@/components/shared/CopyableText";
import { AddressField } from "@/components/shared/AddressField";
import { IntentTimeline } from "./IntentTimeline";
import { PHASE_COLORS, PHASE_LABELS } from "@/config/phaseColors";
import { ArrowRight, Loader2, Clock } from "lucide-react";

function formatDeadline(timestamp: string): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

function isExpired(timestamp: string): boolean {
  return Date.now() > Number(timestamp) * 1000;
}

interface Props {
  intent: Intent;
  timeline: IntentTimelineEvent[] | null;
  isLoadingTimeline: boolean;
  timelineError: string | null;
}

export function IntentDetailsContent({
  intent,
  timeline,
  isLoadingTimeline,
  timelineError,
}: Props) {
  const originChain = intent.originChainId ? getChainName(Number(intent.originChainId)) : "Unknown";
  const destChain = intent.destinationChainId
    ? getChainName(Number(intent.destinationChainId))
    : "Pool Chain";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            {intent.intentType === "DEPOSIT" ? "Deposit" : "Withdrawal"} Intent
          </h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[intent.phase]?.badge}`}
          >
            {PHASE_LABELS[intent.phase] ?? intent.phase.toLowerCase()}
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-sm text-neutral-400">
          <span>{originChain}</span>
          <ArrowRight className="h-3 w-3" />
          <span>{destChain}</span>
        </div>
      </div>

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
              <AddressField address={intent.user} />
            </div>
          )}

          {/* Input/Output Amounts */}
          {intent.inputAmount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Input Amount</span>
              <span className="font-mono text-xs text-neutral-300">
                {formatEthAmount(intent.inputAmount, { decimals: 6 })} ETH
              </span>
            </div>
          )}
          {intent.outputAmount && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Output Amount</span>
              <span className="font-mono text-xs text-neutral-300">
                {formatEthAmount(intent.outputAmount, { decimals: 6 })} ETH
              </span>
            </div>
          )}
          {intent.inputAmount &&
            intent.outputAmount &&
            BigInt(intent.inputAmount) > BigInt(intent.outputAmount) &&
            (() => {
              const input = BigInt(intent.inputAmount);
              const output = BigInt(intent.outputAmount);
              const fee = input - output;
              const percentage = Number((fee * BigInt(10000)) / input) / 100;
              return (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-500">Solver Fee</span>
                  <span className="font-mono text-xs text-amber-400">
                    {formatEthAmount(fee, { decimals: 6 })} ETH ({percentage.toFixed(2)}%)
                  </span>
                </div>
              );
            })()}

          {/* Output Recipient */}
          {(() => {
            const recipientAddress = bytes32ToAddress(intent.outputRecipient);
            if (!recipientAddress) return null;
            return (
              <div className="flex items-center justify-between">
                <span className="text-xs text-neutral-500">Output Recipient</span>
                <AddressField address={recipientAddress} />
              </div>
            );
          })()}

          {/* Deadlines */}
          {intent.fillDeadline && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Fill Deadline</span>
              <span
                className={`flex items-center gap-1 text-xs ${
                  isExpired(intent.fillDeadline) ? "text-red-400" : "text-neutral-300"
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatDeadline(intent.fillDeadline)}
              </span>
            </div>
          )}
          {intent.expires && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Expiry (Refund Available)</span>
              <span
                className={`flex items-center gap-1 text-xs ${
                  isExpired(intent.expires) ? "text-amber-400" : "text-neutral-300"
                }`}
              >
                <Clock className="h-3 w-3" />
                {formatDeadline(intent.expires)}
              </span>
            </div>
          )}

          {/* Solver (if filled) */}
          {intent.solver && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Solver</span>
              <AddressField address={intent.solver} />
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-neutral-400">Timeline</h4>

        {isLoadingTimeline && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-neutral-500" />
          </div>
        )}

        {timelineError && (
          <div className="rounded-xl bg-red-500/10 p-4 text-center">
            <p className="text-sm text-red-400">Failed to load timeline</p>
          </div>
        )}

        {timeline && (
          <div className="rounded-xl bg-white/5 p-4">
            <IntentTimeline events={timeline} currentPhase={intent.phase} />
          </div>
        )}
      </div>
    </div>
  );
}
