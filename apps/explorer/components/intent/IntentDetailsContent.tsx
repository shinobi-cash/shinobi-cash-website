"use client";

import type { Intent, IntentTimelineEvent } from "@shinobi-cash/data";
import { formatEthAmount, formatHash, bytes32ToAddress } from "@/utils/formatters";
import { getChainName } from "@/config/chains";
import { CopyableText } from "../explorer/CopyableText";
import { AddressField } from "../explorer/AddressField";
import { IntentTimeline } from "./IntentTimeline";
import { PHASE_COLORS, PHASE_LABELS } from "./phaseColors";
import { ArrowRight, Loader2, Clock } from "lucide-react";

function formatDeadline(timestamp: bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

function isExpired(timestamp: bigint): boolean {
  return Date.now() > Number(timestamp) * 1000;
}

/**
 * Merge intent data with timeline events
 * The IntentStatusView returns the latest phase which may be missing fields.
 * Timeline events (especially ESCROWED) have the full data.
 */
function mergeIntentWithTimeline(intent: Intent, timeline: IntentTimelineEvent[] | null): Intent {
  if (!timeline || timeline.length === 0) return intent;

  // Find the event with the most data (usually ESCROWED has everything)
  const richEvent = timeline.find(e => e.user || e.inputAmount || e.outputAmount) ?? timeline[0];

  return {
    ...intent,
    user: intent.user ?? richEvent?.user,
    solver: intent.solver ?? richEvent?.solver,
    originChainId: intent.originChainId ?? richEvent?.originChainId,
    destinationChainId: intent.destinationChainId ?? richEvent?.destinationChainId,
    amount: intent.amount ?? richEvent?.amount,
    fillDeadline: intent.fillDeadline ?? richEvent?.fillDeadline,
    expires: intent.expires ?? richEvent?.expires,
    nonce: intent.nonce ?? richEvent?.nonce,
    fillOracle: intent.fillOracle ?? richEvent?.fillOracle,
    intentOracle: intent.intentOracle ?? richEvent?.intentOracle,
    inputAmount: intent.inputAmount ?? richEvent?.inputAmount,
    outputAmount: intent.outputAmount ?? richEvent?.outputAmount,
    outputRecipient: intent.outputRecipient ?? richEvent?.outputRecipient,
  };
}

interface Props {
  intent: Intent;
  timeline: IntentTimelineEvent[] | null;
  isLoadingTimeline: boolean;
  timelineError: string | null;
}

export function IntentDetailsContent({ intent: rawIntent, timeline, isLoadingTimeline, timelineError }: Props) {
  // Merge intent with timeline data to fill in missing fields
  const intent = mergeIntentWithTimeline(rawIntent, timeline);

  const originChain = intent.originChainId ? getChainName(Number(intent.originChainId)) : "Unknown";
  const destChain = intent.destinationChainId ? getChainName(Number(intent.destinationChainId)) : "Pool Chain";

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">
            {intent.intentType === "DEPOSIT" ? "Deposit" : "Withdrawal"} Intent
          </h3>
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${PHASE_COLORS[intent.phase]?.badge ?? PHASE_COLORS.CREATED.badge}`}
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
          {intent.inputAmount && intent.outputAmount && intent.inputAmount > intent.outputAmount && (() => {
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
              <span className={`flex items-center gap-1 text-xs ${
                isExpired(intent.fillDeadline) ? "text-red-400" : "text-neutral-300"
              }`}>
                <Clock className="h-3 w-3" />
                {formatDeadline(intent.fillDeadline)}
              </span>
            </div>
          )}
          {intent.expires && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Expiry (Refund Available)</span>
              <span className={`flex items-center gap-1 text-xs ${
                isExpired(intent.expires) ? "text-amber-400" : "text-neutral-300"
              }`}>
                <Clock className="h-3 w-3" />
                {formatDeadline(intent.expires)}
              </span>
            </div>
          )}

          {/* Nonce */}
          {intent.nonce !== undefined && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Nonce</span>
              <CopyableText
                value={intent.nonce.toString()}
                displayValue={formatHash(intent.nonce.toString())}
                className="font-mono text-xs text-neutral-300"
              />
            </div>
          )}

          {/* Oracles */}
          {intent.fillOracle && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Fill Oracle</span>
              <AddressField address={intent.fillOracle} />
            </div>
          )}
          {intent.intentOracle && intent.intentOracle !== "0x0000000000000000000000000000000000000000" && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Intent Oracle</span>
              <AddressField address={intent.intentOracle} />
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
