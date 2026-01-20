/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain } from "@shinobi-cash/core";
import { formatTimestamp } from "@/utils/formatters";
import { ExternalLink, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { NotesScreenSelectors } from "@/controllers/NotesScreenController";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
  onWithdrawClick?: (noteChain: NoteChain) => void;
}

export function NoteChainScreen({ noteChain, onBack, onWithdrawClick }: NoteChainScreenProps) {
  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const canWithdraw = NotesScreenSelectors.canWithdrawFromChain(noteChain) && !!onWithdrawClick;

  return (
    <ScreenLayout
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
        <div className="space-y-6">
          {/* Balance Summary */}
          <div className="border-border bg-muted rounded-xl border p-4 text-center shadow">
            <p className="text-muted-foreground mb-1 text-sm font-medium">Current Balance</p>
            <div className="mb-2">
              <AmountDisplay
                amount={lastNote.amount}
                layout="stacked"
                ethOptions={{ maxDecimals: 6 }}
                ethClassName="text-2xl font-bold tabular-nums text-white"
                usdClassName="text-sm text-muted-foreground mt-1"
              />
            </div>
            <div
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                lastNote.status === "spent"
                  ? "bg-red-900/30 text-red-400"
                  : !lastNote.isActivated
                    ? "bg-yellow-900/30 text-yellow-400"
                    : "bg-green-900/30 text-green-400"
              }`}
            >
              <div
                className={`h-1.5 w-1.5 rounded-full ${
                  lastNote.status === "spent"
                    ? "bg-red-500"
                    : !lastNote.isActivated
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
              />
              {lastNote.status === "spent"
                ? "Spent"
                : !lastNote.isActivated
                  ? "Pending Fill"
                  : "Available"}
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

          {/* Timeline */}
          <ul className="-mb-8">
            {noteChain.map((note, index) => {
              const isLast = index === noteChain.length - 1;
              return (
                <li key={`${note.depositIndex}-${note.changeIndex}`}>
                  <div className="relative pb-8">
                    {!isLast && (
                      <span
                        className="border-border absolute left-2 top-2 -ml-px h-full w-0.5 border"
                        aria-hidden="true"
                      />
                    )}
                    <div className="relative flex items-start space-x-3">
                      {/* Dot */}
                      <span
                        className={`flex h-4 w-4 items-center justify-center rounded-full ${
                          note.status === "spent" ? "bg-red-500" : "bg-green-500"
                        }`}
                      />

                      {/* Main content */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm font-medium text-white">
                              {index === 0
                                ? "Deposited: "
                                : isLast
                                  ? "Current Balance: "
                                  : "Balance: "}
                              <a
                                href={getTxExplorerUrl(
                                  note.destinationChainId,
                                  note.destinationTransactionHash
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
                              >
                                <AmountDisplay
                                  amount={note.amount}
                                  layout="inline"
                                  ethOptions={{ maxDecimals: 6 }}
                                  showUsd={false}
                                  ethClassName="text-blue-500 hover:text-blue-600"
                                />
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </span>
                            <AmountDisplay
                              amount={note.amount}
                              layout="inline"
                              ethOptions={{ maxDecimals: 6 }}
                              showUsd={true}
                              className="text-muted-foreground text-xs"
                              usdClassName="text-xs text-muted-foreground"
                            />
                          </div>
                          <p className="text-muted-foreground whitespace-nowrap text-xs">
                            {formatTimestamp(note.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </ScreenLayout>
  );
}
