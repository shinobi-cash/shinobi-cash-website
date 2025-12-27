/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain } from "@/lib/storage/types";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ExternalLink, Info } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { BackButton } from "../../../components/ui/back-button";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
  onWithdrawClick?: (noteChain: NoteChain) => void;
}

export function NoteChainScreen({ noteChain, onBack, onWithdrawClick }: NoteChainScreenProps) {
  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const canWithdraw =
    lastNote.status === "unspent" &&
    lastNote.amount &&
    BigInt(lastNote.amount) > BigInt(0) &&
    lastNote.isActivated &&
    !!onWithdrawClick;

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
        <BackButton onClick={onBack} />
        <div>
          <h2 className="text-lg font-semibold text-white">Note Details</h2>
          <p className="text-xs text-gray-400">Detail of your private deposit and withdrawals</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="space-y-6">
          {/* Balance Summary */}
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center shadow">
            <p className="mb-1 text-sm font-medium text-gray-400">Current Balance</p>
            <p className="mb-2 text-2xl font-bold tabular-nums text-white">
              {formatEthAmount(lastNote.amount)} ETH
            </p>
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
                  <p className="text-xs font-medium text-yellow-200">Waiting for Solver</p>
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
                        className="absolute left-2 top-2 -ml-px h-full w-0.5 border border-gray-700"
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
                        <div className="flex items-center justify-between">
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
                              {formatEthAmount(note.amount)} ETH
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </span>
                          <p className="whitespace-nowrap text-xs text-gray-400">
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

      {/* Footer Actions */}
      {canWithdraw && (
        <div className="border-t border-gray-800 px-4 py-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="h-12 flex-1 rounded-xl text-base font-medium"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onWithdrawClick(noteChain)}
              className="h-12 flex-1 rounded-xl text-base font-medium"
              size="lg"
            >
              Withdraw
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
