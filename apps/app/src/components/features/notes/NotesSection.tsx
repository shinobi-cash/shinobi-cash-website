import type { NoteChain } from "@/lib/storage/types";
import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { NoteRow } from "./NoteRow";

interface NotesSectionProps {
  noteChains: NoteChain[];
  loading: boolean;
  error: boolean;
  onNoteChainClick: (noteChain: NoteChain) => void;
}

type NoteFilter = "unspent" | "pending" | "spent";

export function NotesSection({ noteChains, loading, error, onNoteChainClick }: NotesSectionProps) {
  const [activeFilter, setActiveFilter] = useState<NoteFilter>("unspent");

  // Filter note chains based on selected tab
  const filteredNoteChains = noteChains.filter((noteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (activeFilter === "unspent") {
      return lastNote.status === "unspent" && lastNote.isActivated;
    }
    if (activeFilter === "pending") {
      return lastNote.status === "unspent" && !lastNote.isActivated;
    }
    return lastNote.status === activeFilter;
  });

  const unspentCount = noteChains.filter((chain) => {
    const lastNote = chain[chain.length - 1];
    return lastNote.status === "unspent" && lastNote.isActivated;
  }).length;
  const pendingCount = noteChains.filter((chain) => {
    const lastNote = chain[chain.length - 1];
    return lastNote.status === "unspent" && !lastNote.isActivated;
  }).length;
  const spentCount = noteChains.filter((chain) => chain[chain.length - 1].status === "spent").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-shrink-0 bg-app-surface border border-app rounded-t-xl">
        <div className="flex">
          <button
            type="button"
            onClick={() => setActiveFilter("unspent")}
            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "unspent"
                ? "text-app-primary border-b-2 border-green-500"
                : "text-app-secondary hover:text-app-primary"
            }`}
          >
            Available ({unspentCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("pending")}
            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "pending"
                ? "text-app-primary border-b-2 border-yellow-500"
                : "text-app-secondary hover:text-app-primary"
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("spent")}
            className={`flex-1 px-4 py-2 text-sm font-semibold transition-colors ${
              activeFilter === "spent"
                ? "text-app-primary border-b-2 border-red-500"
                : "text-app-secondary hover:text-app-primary"
            }`}
          >
            Spent ({spentCount})
          </button>
        </div>
      </div>

      <div className="flex-1 bg-app-surface border-x border-b border-app rounded-b-xl overflow-hidden">
        <div className="h-full overflow-y-auto">
          {error ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <p className="text-app-secondary mb-1">Unable to load notes</p>
                <p className="text-sm text-app-tertiary">Please check your connection and try again</p>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-app-secondary" />
                <p className="text-app-secondary">Discovering your notes...</p>
              </div>
            </div>
          ) : filteredNoteChains.length === 0 && noteChains.length > 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                {activeFilter === "unspent" ? (
                  <>
                    <span className="text-2xl mb-2 block">💸</span>
                    <p className="text-app-secondary mb-1">No available funds</p>
                    <p className="text-sm text-app-tertiary">All your deposits have been spent</p>
                  </>
                ) : activeFilter === "pending" ? (
                  <>
                    <span className="text-2xl mb-2 block">⏳</span>
                    <p className="text-app-secondary mb-1">No pending deposits</p>
                    <p className="text-sm text-app-tertiary">All cross-chain deposits have been filled</p>
                  </>
                ) : (
                  <>
                    <span className="text-2xl mb-2 block">🔒</span>
                    <p className="text-app-secondary mb-1">No spent deposits</p>
                    <p className="text-sm text-app-tertiary">Your deposits are still available</p>
                  </>
                )}
              </div>
            </div>
          ) : noteChains.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <span className="text-2xl mb-2 block">💰</span>
                <p className="text-app-secondary mb-1">No deposits yet</p>
                <p className="text-sm text-app-tertiary">Make your first private deposit to get started</p>
              </div>
            </div>
          ) : (
            <>
              {filteredNoteChains.map((noteChain, index) => {
                const lastNote = noteChain[noteChain.length - 1];
                return (
                  <div
                    key={`chain-${index}-${lastNote.depositIndex}-${lastNote.changeIndex}`}
                    className="border-b border-app-border last:border-b-0"
                  >
                    <NoteRow
                      note={lastNote}
                      chainLength={noteChain.length}
                      onClick={() => onNoteChainClick(noteChain)}
                    />
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
