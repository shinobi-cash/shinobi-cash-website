/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details with transaction timeline
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain, Note } from "@shinobi-cash/core";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import { ExternalLink, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { NotesScreenSelectors } from "@/controllers/NotesScreenController";
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

function getStatusStyles(note: Note) {
  if (note.status === "spent") {
    return {
      badge: "bg-rose-400/10 text-rose-400",
      dot: "bg-rose-400",
      label: "Spent",
    };
  }
  if (!note.isActivated) {
    return {
      badge: "bg-yellow-400/10 text-yellow-400",
      dot: "bg-yellow-400",
      label: "Pending Fill",
    };
  }
  return {
    badge: "bg-emerald-400/10 text-emerald-400",
    dot: "bg-emerald-400",
    label: "Available",
  };
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
  const canWithdraw = NotesScreenSelectors.canWithdrawFromChain(noteChain) && !!onWithdrawClick;
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
        canWithdraw ? (
          <div className="flex gap-2">
            <Button onClick={onBack} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => onWithdrawClick?.(noteChain)} className="flex-1">
              Withdraw
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

        {/* Pending Deposit Info */}
        {!lastNote.isActivated && (
          <div className="rounded-xl border border-yellow-800 bg-yellow-900/20 p-3">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
              <div>
                <p className="text-xs font-medium text-yellow-200">Waiting for Solver Fill</p>
                <p className="mt-0.5 text-xs text-yellow-400">
                  This cross-chain deposit is waiting to be filled by a solver. Once filled, it
                  will appear in your Available balance.
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
                    <div className="grid min-w-0 flex-1 grid-cols-[100px_1fr_80px_20px_auto] items-center gap-x-3">
                      <span className="text-sm font-medium text-white">{entry.label}</span>
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
                      <span className="whitespace-nowrap text-right text-xs text-neutral-500">
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
