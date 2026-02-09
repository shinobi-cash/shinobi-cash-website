/**
 * HistoryTimeline - Renders the note chain history as a timeline
 */

import { ChevronDown, Merge } from "lucide-react";
import { getChainName } from "@/config/chains";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import type { TimelineEntry } from "./types";
import { getTxChainId } from "./utils";

interface HistoryTimelineProps {
  entries: TimelineEntry[];
  toUsdValue: (amount: string | bigint) => number | null;
}

export function HistoryTimeline({ entries, toUsdValue }: HistoryTimelineProps) {
  return (
    <ul>
      {entries.map((entry, index) => (
        <TimelineEntryItem
          key={entry.key}
          entry={entry}
          isLast={index === entries.length - 1}
          toUsdValue={toUsdValue}
        />
      ))}
    </ul>
  );
}

interface TimelineEntryItemProps {
  entry: TimelineEntry;
  isLast: boolean;
  toUsdValue: (amount: string | bigint) => number | null;
}

function TimelineEntryItem({ entry, isLast, toUsdValue }: TimelineEntryItemProps) {
  const ethAmount = formatEthAmount(entry.amount, { maxDecimals: 6 });
  const usdValue = toUsdValue(entry.amount);
  const amountColorClass = entry.prefix === "-" ? "text-rose-400" : "text-emerald-400";

  const totalFees =
    entry.fees &&
    (entry.fees.relayFee ? BigInt(entry.fees.relayFee) : BigInt(0)) +
      (entry.fees.solverFee ? BigInt(entry.fees.solverFee) : BigInt(0)) +
      (entry.fees.vettingFee ? BigInt(entry.fees.vettingFee) : BigInt(0));
  const hasFeeData = totalFees && totalFees > BigInt(0);

  return (
    <li>
      <div className="relative pb-6 last:pb-0">
        {!isLast && (
          <span
            className="absolute left-2 top-4 -ml-px h-full w-0.5 bg-white/10"
            aria-hidden="true"
          />
        )}
        <div className="relative flex flex-col space-y-1">
          {/* Main row: dot, label, amount */}
          <div className="flex items-center space-x-3">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${entry.dotColor}`}
            />
            <div className="flex flex-1 items-center gap-3">
              <span className="text-sm font-medium text-white">{entry.label}</span>
              <div className="flex flex-1 items-center justify-end gap-2">
                <span className={`text-sm tabular-nums ${amountColorClass}`}>
                  {entry.prefix}
                  {ethAmount} ETH
                </span>
                {usdValue !== null && (
                  <span className="text-xs tabular-nums text-neutral-500">
                    (~{formatUsdAmount(usdValue)})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Transaction link row - hide for cross-chain */}
          {!entry.crossChainSteps?.length && (
            <div className="flex items-center pl-7 text-xs text-neutral-500">
              <a
                href={entry.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {getChainName(getTxChainId(entry.note))}
              </a>
              <span className="mx-2">|</span>
              <span>{formatTimestamp(entry.timestamp)}</span>
            </div>
          )}

          {/* Merge information */}
          <MergeInfo entry={entry} />

          {/* Cross-chain status */}
          {entry.crossChainSteps && entry.crossChainSteps.length > 0 && (
            <CrossChainStatus steps={entry.crossChainSteps} entryKey={entry.key} />
          )}

          {/* Fee breakdown */}
          {hasFeeData && (
            <FeeBreakdown fees={entry.fees!} totalFees={totalFees} toUsdValue={toUsdValue} />
          )}
        </div>
      </div>
    </li>
  );
}

function MergeInfo({ entry }: { entry: TimelineEntry }) {
  if (entry.isMerged && entry.mergedIntoNoteIndex !== undefined) {
    return (
      <div className="flex items-center gap-1.5 pl-7 pt-1 text-xs">
        <Merge className="h-3 w-3 text-violet-400" />
        <span className="text-neutral-400">
          Balance merged into{" "}
          <span className="font-medium text-violet-400">
            Note #{entry.mergedIntoNoteIndex + 1}
          </span>
        </span>
      </div>
    );
  }

  if (entry.mergedFromNoteIndex !== undefined) {
    return (
      <div className="flex items-center gap-1.5 pl-7 pt-1 text-xs">
        <Merge className="h-3 w-3 text-violet-400" />
        <span className="text-neutral-400">
          Includes balance from{" "}
          <span className="font-medium text-violet-400">
            Note #{entry.mergedFromNoteIndex + 1}
          </span>
        </span>
      </div>
    );
  }

  return null;
}

interface CrossChainStatusProps {
  steps: TimelineEntry["crossChainSteps"];
  entryKey: string;
}

function CrossChainStatus({ steps, entryKey }: CrossChainStatusProps) {
  if (!steps || steps.length === 0) return null;

  return (
    <details className="group pl-7 pt-1" open>
      <summary className="flex cursor-pointer items-center gap-1 text-xs text-neutral-500 hover:text-neutral-400">
        <span>Cross-chain Status</span>
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1.5 space-y-1.5">
        {steps.map((step, stepIndex) => (
          <div
            key={`${entryKey}-step-${stepIndex}`}
            className="flex items-center gap-2 text-xs"
          >
            <span className={`h-2 w-2 shrink-0 rounded-full ${step.dotColor}`} />
            <span className="text-neutral-400">{step.label}</span>
            {step.txHash ? (
              <>
                <a
                  href={step.txUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                >
                  {step.chainName}
                </a>
                <span className="text-neutral-600">|</span>
                <span className="text-neutral-500">{formatTimestamp(step.timestamp)}</span>
              </>
            ) : (
              <span className="text-neutral-500">Awaiting solver on {step.chainName}</span>
            )}
          </div>
        ))}
      </div>
    </details>
  );
}

interface FeeBreakdownProps {
  fees: NonNullable<TimelineEntry["fees"]>;
  totalFees: bigint;
  toUsdValue: (amount: string | bigint) => number | null;
}

function FeeBreakdown({ fees, totalFees, toUsdValue }: FeeBreakdownProps) {
  return (
    <details className="group pl-7 pt-1">
      <summary className="flex cursor-pointer items-center gap-1 text-xs text-neutral-500 hover:text-neutral-400">
        <span>Fees: -{formatEthAmount(totalFees, { maxDecimals: 6 })} ETH</span>
        {toUsdValue(totalFees) !== null && (
          <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(totalFees)!)})</span>
        )}
        <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="mt-1 space-y-0.5 text-xs">
        {fees.relayFee && BigInt(fees.relayFee) > BigInt(0) && (
          <FeeRow label="Relay Fee" amount={fees.relayFee} toUsdValue={toUsdValue} />
        )}
        {fees.solverFee && BigInt(fees.solverFee) > BigInt(0) && (
          <FeeRow label="Solver Fee" amount={fees.solverFee} toUsdValue={toUsdValue} />
        )}
        {fees.vettingFee && BigInt(fees.vettingFee) > BigInt(0) && (
          <FeeRow label="Compliance Fee" amount={fees.vettingFee} toUsdValue={toUsdValue} />
        )}
      </div>
    </details>
  );
}

function FeeRow({
  label,
  amount,
  toUsdValue,
}: {
  label: string;
  amount: string;
  toUsdValue: (amount: string | bigint) => number | null;
}) {
  return (
    <div className="flex justify-between text-neutral-500">
      <span>{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-orange-400/70">
          -{formatEthAmount(amount, { maxDecimals: 6 })} ETH
        </span>
        {toUsdValue(amount) !== null && (
          <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(amount)!)})</span>
        )}
      </div>
    </div>
  );
}
