/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details with transaction timeline
 */

import { useRouter } from "next/navigation";
import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain, Note, ChangeNote } from "@shinobi-cash/core/discovery";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import { ExternalLink, ChevronDown, Merge, Lock, Unlock } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { Section, Row } from "@/components/shared/Section";
import { CopyableText } from "@/components/shared/CopyableText";
import { usePriceData } from "@/hooks/usePriceData";
import { canWithdraw, canRagequit, isPendingIntentNote, isRefundNote } from "@/utils/noteFiltering";
import { WithdrawController } from "@/controllers/WithdrawController";
import { RagequitController } from "@/controllers/RagequitController";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
}

interface TimelineEntry {
  key: string;
  label: string;
  amount: bigint;
  prefix: "+" | "-" | "";
  dotColor: string;
  txHash: string;
  txUrl: string;
  timestamp: string | bigint;
  note: Note;
  // Fee information (for withdrawals)
  fees?: {
    relayFee?: string;
    solverFee?: string;
    vettingFee?: string;
  };
  // Merge information
  isMerged?: boolean;
  mergedIntoNoteIndex?: number;
  mergedFromNoteIndex?: number;
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
    txHash: firstNote.destinationTransactionHash,
    txUrl: getTxExplorerUrl(firstNote.destinationChainId, firstNote.destinationTransactionHash),
    timestamp: firstNote.timestamp,
    note: firstNote,
  });

  // Subsequent entries: Each represents a withdrawal, merge, pending intent, or refund
  for (let i = 1; i < noteChain.length; i++) {
    const prevNote = noteChain[i - 1];
    const note = noteChain[i];

    // Handle PendingIntentNote - escrowed funds awaiting solver or refund
    if (isPendingIntentNote(note)) {
      entries.push({
        key: `pending-intent-${note.depositIndex}-${note.changeIndex}`,
        label: "Escrowed (Cross-chain)",
        amount: BigInt(note.amount),
        prefix: "-",
        dotColor: note.intentStatus === "pending" ? "bg-amber-400" : "bg-neutral-500",
        txHash: note.originTransactionHash,
        txUrl: getTxExplorerUrl(note.originChainId, note.originTransactionHash),
        timestamp: note.timestamp,
        note: note,
      });
      continue;
    }

    // Handle RefundNote - refunded cross-chain funds
    if (isRefundNote(note)) {
      entries.push({
        key: `refund-${note.depositIndex}-${note.changeIndex}-${note.refundIndex}`,
        label: "Refunded",
        amount: BigInt(note.amount),
        prefix: "+",
        dotColor: "bg-orange-400",
        txHash: note.originTransactionHash,
        txUrl: getTxExplorerUrl(note.originChainId, note.originTransactionHash),
        timestamp: note.timestamp,
        note: note,
      });
      continue;
    }

    const changeNote = note as ChangeNote;

    // Check if this note was created from a Withdraw2 merge (primary chain)
    const mergedFromNoteIndex = changeNote.mergedFromDepositIndex;

    // Check if this note is a merged note (secondary chain in Withdraw2)
    // The merged note has status 'merged' and mergedIntoDepositIndex set
    const isMergedNote = note.status === "merged" && 'mergedIntoDepositIndex' in note && note.mergedIntoDepositIndex !== undefined;

    if (isMergedNote) {
      // Secondary chain: This chain's balance was merged into another chain via Withdraw2
      // Show as "Withdrew + Merged" with the contributed balance (from prevNote)
      const contributedAmount = BigInt(prevNote.amount);
      const mergedLabel = note.isCrossChain ? "Merged + Crosschain Withdrew" : "Merged + Withdrew";

      entries.push({
        key: `merged-${note.depositIndex}-${note.changeIndex}`,
        label: mergedLabel,
        amount: contributedAmount,
        prefix: "-",
        dotColor: "bg-violet-400",
        txHash: note.destinationTransactionHash,
        txUrl: getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash),
        timestamp: note.timestamp,
        note: note,
        isMerged: true,
        mergedIntoNoteIndex: changeNote.mergedIntoDepositIndex,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
      });
    } else {
      // Regular withdrawal or Withdraw2 on primary chain
      const withdrawnAmount = BigInt(prevNote.amount) - BigInt(note.amount);

      // Determine label based on cross-chain and merge status
      const getWithdrawalLabel = (): string => {
        const withdrawType = note.isCrossChain ? "Crosschain Withdrew" : "Withdrew";
        if (mergedFromNoteIndex !== undefined) {
          return `Merged + ${withdrawType}`;
        }
        return withdrawType;
      };

      entries.push({
        key: `withdraw-${note.depositIndex}-${note.changeIndex}`,
        label: getWithdrawalLabel(),
        amount: withdrawnAmount,
        prefix: "-",
        dotColor: mergedFromNoteIndex !== undefined ? "bg-violet-400" : "bg-rose-400",
        txHash: note.destinationTransactionHash,
        txUrl: getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash),
        timestamp: note.timestamp,
        note: note,
        mergedFromNoteIndex: mergedFromNoteIndex,
        fees: {
          relayFee: note.activityData.relayFeeAmount,
          solverFee: note.activityData.solverFeeAmount,
          vettingFee: note.activityData.vettingFeeAmount,
        },
      });
    }
  }

  // Check if the last note was ragequit (public withdrawal)
  const lastNote = noteChain[noteChain.length - 1];
  if (lastNote.status === "spent" && lastNote.activityData.ragequitTxHash) {
    entries.push({
      key: `ragequit-${lastNote.depositIndex}-${lastNote.changeIndex}`,
      label: "Withdrew Publicly",
      amount: BigInt(lastNote.amount),
      prefix: "-",
      dotColor: "bg-orange-400",
      txHash: lastNote.activityData.ragequitTxHash,
      txUrl: getTxExplorerUrl(lastNote.destinationChainId, lastNote.activityData.ragequitTxHash),
      timestamp: lastNote.activityData.ragequitTimestamp || lastNote.timestamp,
      note: lastNote,
    });
  }

  return entries;
}

export function NoteChainScreen({ noteChain, onBack }: NoteChainScreenProps) {
  const router = useRouter();
  const { usdPrice } = usePriceData("ETH");

  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const canWithdrawPrivately = canWithdraw(lastNote);
  const canWithdrawPublicly = canRagequit(lastNote);
  const hasActions = canWithdrawPrivately || canWithdrawPublicly;

  const handleWithdrawPrivately = () => {
    WithdrawController.selectNote(lastNote);
    router.push(`/withdraw?note=${lastNote.depositIndex}`);
  };

  const handleWithdrawPublicly = () => {
    RagequitController.selectNote(lastNote);
    router.push(`/ragequit?note=${lastNote.depositIndex}`);
  };

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
      containerClassName="flex-1 sm:flex-none sm:h-[600px]"
      header={
        <ScreenHeader
          title="Note Details"
          subtitle="Detail of your private deposit and withdrawals"
          onBack={onBack}
        />
      }
      footer={
        hasActions ? (
          <div className="flex flex-row gap-3">
            {canWithdrawPublicly && (
              <Button
                onClick={handleWithdrawPublicly}
                variant="outline"
                className="h-12 flex-1 rounded-xl border-white/10 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white"
                size="lg"
              >
                <Unlock className="mr-2 h-4 w-4" />
                Withdraw Publicly
              </Button>
            )}
            {canWithdrawPrivately && (
              <Button
                onClick={handleWithdrawPrivately}
                className="h-12 flex-1 rounded-xl text-sm font-semibold sm:text-base"
                size="lg"
              >
                <Lock className="mr-2 h-4 w-4" />
                Withdraw Privately
              </Button>
            )}
          </div>
        ) : undefined
      }
    >
      <div className="space-y-4">
        {/* Balance Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-400">Remaining Balance</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-bold tabular-nums text-white">
              {formatEthAmount(lastNote.amount, { maxDecimals: 6 })} ETH
            </span>
            {toUsdValue(lastNote.amount) !== null && (
              <span className="text-sm text-neutral-400">
                (~{formatUsdAmount(toUsdValue(lastNote.amount)!)})
              </span>
            )}
          </div>
        </div>

        {/* Status Section */}
        <Section title="Status">
          <Row label="Note" value={`#${lastNote.depositIndex + 1}`} />
          <Row
            label="Status"
            value={
              <span
                className={`capitalize ${
                  lastNote.status === "merged"
                    ? "text-violet-400"
                    : lastNote.status === "spent"
                      ? "text-neutral-400"
                      : "text-emerald-400"
                }`}
              >
                {lastNote.status}
              </span>
            }
          />
          {lastNote.isCrossChain && lastNote.intentStatus && lastNote.intentStatus !== "filled" && (
            <Row
              label="Intent Status"
              value={
                <span
                  className={`capitalize ${lastNote.intentStatus === "pending" ? "text-yellow-400" : "text-orange-400"}`}
                >
                  {lastNote.intentStatus}
                </span>
              }
            />
          )}
          <Row
            label="ASP Status"
            value={
              <span
                className={`capitalize ${
                  lastNote.aspStatus === "approved"
                    ? "text-emerald-400"
                    : lastNote.aspStatus === "pending"
                      ? "text-blue-400"
                      : "text-red-400"
                }`}
              >
                {lastNote.aspStatus}
              </span>
            }
          />
        </Section>

        {/* History Section */}
        <Section title="History">
          <div className="px-3 py-2">
            <ul>
              {timelineEntries.map((entry, index) => {
                const isLastEntry = index === timelineEntries.length - 1;
                const ethAmount = formatEthAmount(entry.amount, { maxDecimals: 6 });
                const usdValue = toUsdValue(entry.amount);
                const amountColorClass =
                  entry.prefix === "-" ? "text-rose-400" : "text-emerald-400";

                // Calculate total fees for this entry
                const totalFees =
                  entry.fees &&
                  (entry.fees.relayFee ? BigInt(entry.fees.relayFee) : BigInt(0)) +
                    (entry.fees.solverFee ? BigInt(entry.fees.solverFee) : BigInt(0)) +
                    (entry.fees.vettingFee ? BigInt(entry.fees.vettingFee) : BigInt(0));
                const hasFeeData = totalFees && totalFees > BigInt(0);

                return (
                  <li key={entry.key}>
                    <div className="relative pb-6 last:pb-0">
                      {!isLastEntry && (
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
                        {/* Transaction and timestamp row */}
                        <div className="flex items-center pl-7 text-xs text-neutral-500">
                          <a
                            href={entry.txUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-400 hover:text-blue-300"
                          >
                            <CopyableText
                              text={entry.txHash}
                              truncateStart={6}
                              truncateEnd={4}
                              showIcon={false}
                              className="text-xs text-blue-400 hover:text-blue-300"
                            />
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <span className="mx-2">|</span>
                          <span>{formatTimestamp(entry.timestamp)}</span>
                        </div>
                        {/* Merge information */}
                        {entry.isMerged && entry.mergedIntoNoteIndex !== undefined && (
                          <div className="flex items-center gap-1.5 pl-7 pt-1 text-xs">
                            <Merge className="h-3 w-3 text-violet-400" />
                            <span className="text-neutral-400">
                              Balance merged into{" "}
                              <span className="font-medium text-violet-400">
                                Note #{entry.mergedIntoNoteIndex + 1}
                              </span>
                            </span>
                          </div>
                        )}
                        {entry.mergedFromNoteIndex !== undefined && (
                          <div className="flex items-center gap-1.5 pl-7 pt-1 text-xs">
                            <Merge className="h-3 w-3 text-violet-400" />
                            <span className="text-neutral-400">
                              Includes balance from{" "}
                              <span className="font-medium text-violet-400">
                                Note #{entry.mergedFromNoteIndex + 1}
                              </span>
                            </span>
                          </div>
                        )}
                        {/* Fee breakdown (collapsible for withdrawals) */}
                        {hasFeeData && (
                          <details className="group pl-7 pt-1">
                            <summary className="flex cursor-pointer items-center gap-1 text-xs text-neutral-500 hover:text-neutral-400">
                              <span>
                                Fees: -{formatEthAmount(totalFees, { maxDecimals: 6 })} ETH
                              </span>
                              {toUsdValue(totalFees) !== null && (
                                <span className="text-neutral-600">
                                  (~{formatUsdAmount(toUsdValue(totalFees)!)})
                                </span>
                              )}
                              <ChevronDown className="h-3 w-3 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="mt-1 space-y-0.5 text-xs">
                              {entry.fees?.relayFee && BigInt(entry.fees.relayFee) > BigInt(0) && (
                                <div className="flex justify-between text-neutral-500">
                                  <span>Relay Fee</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-orange-400/70">
                                      -{formatEthAmount(entry.fees.relayFee, { maxDecimals: 6 })}{" "}
                                      ETH
                                    </span>
                                    {toUsdValue(entry.fees.relayFee) !== null && (
                                      <span className="text-neutral-600">
                                        (~{formatUsdAmount(toUsdValue(entry.fees.relayFee)!)})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {entry.fees?.solverFee &&
                                BigInt(entry.fees.solverFee) > BigInt(0) && (
                                  <div className="flex justify-between text-neutral-500">
                                    <span>Solver Fee</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-orange-400/70">
                                        -{formatEthAmount(entry.fees.solverFee, { maxDecimals: 6 })}{" "}
                                        ETH
                                      </span>
                                      {toUsdValue(entry.fees.solverFee) !== null && (
                                        <span className="text-neutral-600">
                                          (~{formatUsdAmount(toUsdValue(entry.fees.solverFee)!)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              {entry.fees?.vettingFee &&
                                BigInt(entry.fees.vettingFee) > BigInt(0) && (
                                  <div className="flex justify-between text-neutral-500">
                                    <span>Compliance Fee</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-orange-400/70">
                                        -
                                        {formatEthAmount(entry.fees.vettingFee, { maxDecimals: 6 })}{" "}
                                        ETH
                                      </span>
                                      {toUsdValue(entry.fees.vettingFee) !== null && (
                                        <span className="text-neutral-600">
                                          (~{formatUsdAmount(toUsdValue(entry.fees.vettingFee)!)})
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          </details>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </Section>
      </div>
    </ScreenLayout>
  );
}
