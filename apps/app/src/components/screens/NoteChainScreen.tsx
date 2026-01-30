/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details with transaction timeline
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain, Note } from "@shinobi-cash/core";
import { formatEthAmount, formatTimestamp, formatUsdAmount } from "@/utils/formatters";
import { canWithdraw, canRagequit } from "@/utils/noteFiltering";
import { ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { CopyableText } from "@/components/shared/CopyableText";
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
      txHash: note.destinationTransactionHash,
      txUrl: getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash),
      timestamp: note.timestamp,
      note: note,
      fees: {
        relayFee: note.activityData.relayFeeAmount,
        solverFee: note.activityData.solverFeeAmount,
        vettingFee: note.activityData.vettingFeeAmount,
      },
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
      containerClassName="h-[600px] bg-white/[0.02]"
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
      <div className="space-y-4">
        {/* Balance Summary */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-center">
          <p className="mb-1 text-sm font-medium text-neutral-400">Remaining Balance</p>
          <div className="flex justify-center items-center gap-2">
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
          {lastNote.isCrossChain && lastNote.intentStatus && lastNote.intentStatus !== "filled" && (
            <Row
              label="Intent Status"
              value={
                <span className={`capitalize ${lastNote.intentStatus === "pending" ? "text-yellow-400" : "text-orange-400"}`}>
                  {lastNote.intentStatus}
                </span>
              }
            />
          )}
          <Row
            label="ASP Status"
            value={
              <span className={`capitalize ${
                lastNote.aspStatus === "approved" ? "text-emerald-400" :
                lastNote.aspStatus === "pending" ? "text-blue-400" : "text-red-400"
              }`}>
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
                const amountColorClass = entry.prefix === "-" ? "text-rose-400" : "text-emerald-400";

                // Calculate total fees for this entry
                const totalFees = entry.fees && (
                  (entry.fees.relayFee ? BigInt(entry.fees.relayFee) : BigInt(0)) +
                  (entry.fees.solverFee ? BigInt(entry.fees.solverFee) : BigInt(0)) +
                  (entry.fees.vettingFee ? BigInt(entry.fees.vettingFee) : BigInt(0))
                );
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
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${entry.dotColor}`} />
                          <div className="flex flex-1 gap-3 items-center">
                            <span className="text-sm font-medium text-white">{entry.label}</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className={`text-sm tabular-nums ${amountColorClass}`}>
                                {entry.prefix}{ethAmount} ETH
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
                        {/* Fee breakdown (collapsible for withdrawals) */}
                        {hasFeeData && (
                          <details className="pl-7 pt-1 group">
                            <summary className="flex items-center gap-1 text-xs text-neutral-500 cursor-pointer hover:text-neutral-400">
                              <span>Fees: -{formatEthAmount(totalFees, { maxDecimals: 6 })} ETH</span>
                              {toUsdValue(totalFees) !== null && (
                                <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(totalFees)!)})</span>
                              )}
                              <ChevronDown className="h-3 w-3 group-open:rotate-180 transition-transform" />
                            </summary>
                            <div className="mt-1 space-y-0.5 text-xs">
                              {entry.fees?.relayFee && BigInt(entry.fees.relayFee) > BigInt(0) && (
                                <div className="flex justify-between text-neutral-500">
                                  <span>Relay Fee</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-orange-400/70">
                                      -{formatEthAmount(entry.fees.relayFee, { maxDecimals: 6 })} ETH
                                    </span>
                                    {toUsdValue(entry.fees.relayFee) !== null && (
                                      <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(entry.fees.relayFee)!)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {entry.fees?.solverFee && BigInt(entry.fees.solverFee) > BigInt(0) && (
                                <div className="flex justify-between text-neutral-500">
                                  <span>Solver Fee</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-orange-400/70">
                                      -{formatEthAmount(entry.fees.solverFee, { maxDecimals: 6 })} ETH
                                    </span>
                                    {toUsdValue(entry.fees.solverFee) !== null && (
                                      <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(entry.fees.solverFee)!)})</span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {entry.fees?.vettingFee && BigInt(entry.fees.vettingFee) > BigInt(0) && (
                                <div className="flex justify-between text-neutral-500">
                                  <span>Compliance Fee</span>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-orange-400/70">
                                      -{formatEthAmount(entry.fees.vettingFee, { maxDecimals: 6 })} ETH
                                    </span>
                                    {toUsdValue(entry.fees.vettingFee) !== null && (
                                      <span className="text-neutral-600">(~{formatUsdAmount(toUsdValue(entry.fees.vettingFee)!)})</span>
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

// Helper components

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <div className="px-3 py-2 border-b border-white/5">
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="divide-y divide-white/5">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5">
      <span className="text-sm text-neutral-400">{label}</span>
      <span className="text-sm text-white">{value}</span>
    </div>
  );
}
