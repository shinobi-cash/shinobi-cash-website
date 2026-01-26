/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details with transaction timeline
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain, Note } from "@shinobi-cash/core";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import { canWithdraw, canRagequit, getPendingReason } from "@/utils/noteFiltering";
import { ExternalLink, Info, AlertTriangle } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { usePriceData } from "@/hooks/usePriceData";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
  onWithdrawClick?: (noteChain: NoteChain) => void;
}

interface TimelineEntry {
  key: string;
  label: string;
  amount: bigint;
  prefix: "+" | "-";
  dotColor: string;
  txUrl: string;
  timestamp: string | bigint;
}

interface StatusStyle {
  badge: string;
  dot: string;
  label: string;
}

function getStatusStyles(note: Note): StatusStyle {
  // Spent notes
  if (note.status === "spent") {
    return {
      badge: "bg-rose-400/10 text-rose-400",
      dot: "bg-rose-400",
      label: "Spent",
    };
  }

  // Available for private withdrawal
  if (canWithdraw(note)) {
    return {
      badge: "bg-emerald-400/10 text-emerald-400",
      dot: "bg-emerald-400",
      label: "Available",
    };
  }

  // Get specific pending reason
  const pendingReason = getPendingReason(note);

  switch (pendingReason) {
    case "waitingForSolver":
      return {
        badge: "bg-yellow-400/10 text-yellow-400",
        dot: "bg-yellow-400",
        label: "Awaiting Solver",
      };
    case "awaitingApproval":
      return {
        badge: "bg-blue-400/10 text-blue-400",
        dot: "bg-blue-400",
        label: "Awaiting Approval",
      };
    case "rejected":
      return {
        badge: "bg-orange-400/10 text-orange-400",
        dot: "bg-orange-400",
        label: "Rejected",
      };
    default:
      // Fallback for any edge cases
      return {
        badge: "bg-neutral-400/10 text-neutral-400",
        dot: "bg-neutral-400",
        label: "Unknown",
      };
  }
}

function buildTimelineEntries(noteChain: NoteChain): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const firstNote = noteChain[0];

  // First entry: Deposit
  entries.push({
    key: `deposit-${firstNote.depositIndex}`,
    label: "Deposited",
    amount: BigInt(firstNote.amount),
    prefix: "+",
    dotColor: "bg-emerald-400",
    txUrl: getTxExplorerUrl(firstNote.destinationChainId, firstNote.destinationTransactionHash),
    timestamp: firstNote.timestamp,
  });

  // Subsequent entries: Each represents a withdrawal
  for (let i = 1; i < noteChain.length; i++) {
    const prevNote = noteChain[i - 1];
    const note = noteChain[i];
    const withdrawnAmount = BigInt(prevNote.amount) - BigInt(note.amount);

    entries.push({
      key: `withdraw-${note.depositIndex}-${note.changeIndex}`,
      label: "Withdrew",
      amount: withdrawnAmount,
      prefix: "-",
      dotColor: "bg-rose-400",
      txUrl: getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash),
      timestamp: note.timestamp,
    });
  }

  return entries;
}

export function NoteChainScreen({ noteChain, onBack, onWithdrawClick }: NoteChainScreenProps) {
  const { usdPrice } = usePriceData("ETH");

  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const isWithdrawable = canWithdraw(lastNote) && !!onWithdrawClick;
  const isRagequitable = canRagequit(lastNote);
  const pendingReason = getPendingReason(lastNote);
  const statusStyles = getStatusStyles(lastNote);

  // Convert ETH amount to USD value
  const toUsdValue = (amount: string | bigint): number | null => {
    const ethAmount = formatEthAmount(amount, { maxDecimals: 6 });
    const ethAsNumber = Number.parseFloat(ethAmount);
    return usdPrice && !Number.isNaN(ethAsNumber) ? ethAsNumber * usdPrice : null;
  };

  // Build timeline entries: Deposit followed by Withdrawals
  const timelineEntries = buildTimelineEntries(noteChain);

  return (
    <ScreenLayout
      containerClassName="h-[600px]"
      header={
        <ScreenHeader
          title="Note Details"
          subtitle="Detail of your private deposit and withdrawals"
          onBack={onBack}
        />
      }
      footer={
        isWithdrawable ? (
          <div className="flex gap-2">
            <Button
              onClick={onBack}
              variant="outline"
              className="h-12 flex-1 rounded-xl text-base font-semibold sm:h-14 sm:text-lg"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onWithdrawClick?.(noteChain)}
              className="h-12 flex-1 rounded-xl text-base font-semibold sm:h-14 sm:text-lg"
              size="lg"
            >
              Withdraw
            </Button>
          </div>
        ) : isRagequitable ? (
          <div className="flex gap-2">
            <Button
              onClick={onBack}
              variant="outline"
              className="h-12 flex-1 rounded-xl text-base font-semibold sm:h-14 sm:text-lg"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled
              className="h-12 flex-1 rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
              size="lg"
            >
              Ragequit (Coming Soon)
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="space-y-6">
        {/* Balance Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-400">Remaining Balance</p>
          <div className="mb-2 flex justify-center items-center">
            <span className="text-2xl font-bold tabular-nums text-white">
              {formatEthAmount(lastNote.amount, { maxDecimals: 6 })} ETH
            </span>
            {toUsdValue(lastNote.amount) !== null && (
              <span className="mt-1 text-sm text-neutral-400">
                (~{formatUsdAmount(toUsdValue(lastNote.amount)!)})
              </span>
            )}
          </div>
          <div className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusStyles.badge}`}>
            <div className={`h-1.5 w-1.5 rounded-full ${statusStyles.dot}`} />
            {statusStyles.label}
          </div>
        </div>

        {/* Pending Status Info */}
        {pendingReason === "waitingForSolver" && (
          <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <div>
                <p className="text-xs font-medium text-yellow-200">Waiting for Solver</p>
                <p className="mt-0.5 text-xs text-yellow-400">
                  This cross-chain deposit is waiting to be filled by a solver. Once filled, it
                  will appear in your Available balance.
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingReason === "awaitingApproval" && (
          <div className="rounded-xl border border-blue-800 bg-blue-900/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-400" />
              <div>
                <p className="text-xs font-medium text-blue-200">Awaiting Approval</p>
                <p className="mt-0.5 text-xs text-blue-400">
                  This deposit is in the pool and awaiting compliance approval. Once approved, it
                  will be available for private withdrawal.
                </p>
              </div>
            </div>
          </div>
        )}

        {pendingReason === "rejected" && (
          <div className="rounded-xl border border-orange-800 bg-orange-900/20 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
              <div>
                <p className="text-xs font-medium text-orange-200">Compliance Rejected</p>
                <p className="mt-0.5 text-xs text-orange-400">
                  This deposit was not approved for private withdrawal. You can use Ragequit to
                  withdraw your funds without privacy protection.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Timeline */}
        <ul className="-mb-8">
          {timelineEntries.map((entry, index) => {
            const isLastEntry = index === timelineEntries.length - 1;
            const ethAmount = formatEthAmount(entry.amount, { maxDecimals: 6 });
            const usdValue = toUsdValue(entry.amount);
            const amountColorClass = entry.prefix === "-" ? "text-rose-400" : "text-emerald-400";

            return (
              <li key={entry.key}>
                <div className="relative pb-8">
                  {!isLastEntry && (
                    <span
                      className="absolute left-2 top-4 -ml-px h-full w-0.5 bg-white/10"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative flex items-center space-x-3">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${entry.dotColor}`} />
                    <div className="flex flex-1 gap-3">
                      <span className="text-sm font-medium text-white justify-start">{entry.label}</span>
                      <div className="flex items-center gap-2 justify-end flex-1">
                        <span className={`text-sm tabular-nums text-right ${amountColorClass}`}>
                          {entry.prefix}{ethAmount} ETH
                        </span>
                        <span className="text-xs tabular-nums text-right text-neutral-500">
                          {usdValue !== null ? `(~${formatUsdAmount(usdValue)})` : ""}
                        </span>
                        <a
                          href={entry.txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex justify-center text-neutral-400 hover:text-white"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                     
                      <span className="flex flex-1 whitespace-nowrap text-right text-xs text-neutral-500 justify-end">
                        {formatTimestamp(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </ScreenLayout>
  );
}
