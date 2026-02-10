/**
 * HistoryTimeline - Renders the note chain history as a timeline
 */

import { Merge } from "lucide-react";
import { getChainName } from "@/config/chains";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import type { TimelineEntry } from "./types";

interface HistoryTimelineProps {
  entries: TimelineEntry[];
  toUsdValue: (amount: string | bigint) => number | null;
}

export function HistoryTimeline({ entries, toUsdValue }: HistoryTimelineProps) {
  return (
    <ul className="space-y-4">
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
  const hasCrossChainSteps = entry.crossChainSteps && entry.crossChainSteps.length > 0;

  // Get merge label for both winner and loser chains
  // Winner chain: shows "balance from" (mergedFromSerialNumber)
  // Loser chain: shows "merged into" (mergedIntoSerialNumber)
  const mergeLabel = entry.mergedFromSerialNumber ?? entry.mergedIntoSerialNumber ?? null;

  return (
    <li>
      <div className="relative">
        {!isLast && (
          <span
            className="absolute left-2 top-4 -ml-px h-full w-0.5 bg-white/10"
            aria-hidden="true"
          />
        )}
        <div className="relative flex flex-col space-y-1">
          <div className="flex items-center space-x-3">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${entry.dotColor}`}
            />
            <div className="flex flex-1 items-center gap-3">
              <EntryLabel label={entry.label} mergeLabel={mergeLabel} />
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

          {/* Cross-chain steps (always visible) */}
          {hasCrossChainSteps ? (
            <div className="space-y-1.5 pl-7">
              {entry.crossChainSteps!.map((step, stepIndex) => (
                <div
                  key={`${entry.key}-step-${stepIndex}`}
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
          ) : (
            <div className="flex items-center pl-7 text-xs text-neutral-500">
              <a
                href={entry.txUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 hover:underline"
              >
                {getChainName(entry.note.originChainId)}
              </a>
              <span className="mx-2">|</span>
              <span>{formatTimestamp(entry.timestamp)}</span>
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

/** Entry label with optional merge icon and related note (merge info comes first, action at end) */
function EntryLabel({ label, mergeLabel }: { label: string; mergeLabel: string | null }) {
  if (mergeLabel) {
    return (
      <span className="flex items-center gap-1.5 text-sm font-medium text-white">
        <Merge className="h-3 w-3 text-violet-400" />
        <span className="text-violet-400">{mergeLabel}</span>
        <span className="text-neutral-500">+</span>
        {label}
      </span>
    );
  }
  return <span className="text-sm font-medium text-white">{label}</span>;
}

