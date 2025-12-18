/**
 * Note Chain Screen Component
 * Full-screen view for displaying note chain details
 */

import { getTxExplorerUrl } from "@/config/chains";
import type { NoteChain } from "@/lib/storage/types";
import { formatEthAmount, formatTimestamp } from "@/utils/formatters";
import { ExternalLink, Info } from "lucide-react";
import { Button } from "../../ui/button";
import { BackButton } from "../../ui/back-button";

interface NoteChainScreenProps {
  noteChain: NoteChain | null;
  onBack: () => void;
  onWithdrawClick?: (noteChain: NoteChain) => void;
}

export function NoteChainScreen({ noteChain, onBack, onWithdrawClick }: NoteChainScreenProps) {
  if (!noteChain) return null;

  const lastNote = noteChain[noteChain.length - 1];
  const canWithdraw = lastNote.status === "unspent" && lastNote.amount && BigInt(lastNote.amount) > BigInt(0) && lastNote.isActivated && !!onWithdrawClick;

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
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
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 shadow text-center">
            <p className="text-sm font-medium text-gray-400 mb-1">Current Balance</p>
            <p className="text-2xl font-bold text-white tabular-nums mb-2">
              {formatEthAmount(lastNote.amount)} ETH
            </p>
            <div
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                lastNote.status === "spent"
                  ? "bg-red-900/30 text-red-400"
                  : !lastNote.isActivated
                    ? "bg-yellow-900/30 text-yellow-400"
                    : "bg-green-900/30 text-green-400"
              }`}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full ${
                  lastNote.status === "spent"
                    ? "bg-red-500"
                    : !lastNote.isActivated
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
              />
              {lastNote.status === "spent" ? "Spent" : !lastNote.isActivated ? "Pending Fill" : "Available"}
            </div>
          </div>

          {/* Pending Deposit Info */}
          {!lastNote.isActivated && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-yellow-200">Waiting for Solver</p>
                  <p className="text-xs text-yellow-400 mt-0.5">
                    This cross-chain deposit is waiting to be filled by a solver. Once filled, it will appear in your Available balance.
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
                      <span className="absolute left-2 top-2 -ml-px h-full w-0.5 border border-gray-700" aria-hidden="true" />
                    )}
                    <div className="relative flex items-start space-x-3">
                      {/* Dot */}
                      <span
                        className={`h-4 w-4 rounded-full flex items-center justify-center ${
                          note.status === "spent" ? "bg-red-500" : "bg-green-500"
                        }`}
                      />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-white">
                            {index === 0 ? "Deposited: " : isLast ? "Current Balance: " : "Balance: "}
                            <a
                              href={getTxExplorerUrl(note.destinationChainId, note.destinationTransactionHash)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600"
                            >
                              {formatEthAmount(note.amount)} ETH
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </span>
                          <p className="text-xs text-gray-400 whitespace-nowrap">{formatTimestamp(note.timestamp)}</p>
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
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onBack}
              className="flex-1 h-12 text-base font-medium rounded-xl"
              size="lg"
            >
              Cancel
            </Button>
            <Button
              onClick={() => onWithdrawClick(noteChain)}
              className="flex-1 h-12 text-base font-medium rounded-xl bg-orange-600 hover:bg-orange-700"
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
