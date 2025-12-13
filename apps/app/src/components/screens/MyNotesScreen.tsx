// File: src/components/screens/MyNotesScreen.tsx

import { useAuth } from "@/contexts/AuthContext";
import { useNotesData } from "@/hooks/notes/useNotesData";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { Note, NoteChain } from "@/lib/storage/types";
import { useState } from "react";
import { NoteChainDrawer } from "../features/notes/NoteChainDrawer";
import { NotesSection } from "../features/notes/NotesSection";
import { NotesSummaryCard } from "../features/notes/NotesSummary";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
import { BackButton } from "../ui/back-button";

export const MyNotesScreen = () => {
  const { isAuthenticated, publicKey, accountKey } = useAuth();

  // Guard clause for unauthenticated users
  if (!isAuthenticated || !publicKey || !accountKey) {
    return null;
  }

  // Use state to manage the current view (notes list or withdrawal form)
  const [withdrawalState, setWithdrawalState] = useState<{
    isShowing: boolean;
    note: Note | null;
  }>({
    isShowing: false,
    note: null,
  });

  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const {
    noteChains,
    unspentNotesCount,
    totalNotesCount,
    loading,
    error,
    progress,
    isRefreshing,
    noteDiscovery,
    handleRefresh,
  } = useNotesData(); // Use the new hook

  const startWithdrawal = (noteChain: NoteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (lastNote.status === "unspent" && lastNote.isActivated) {
      setWithdrawalState({ isShowing: true, note: lastNote });
      noteChainModal.setOpen(false);
    }
  };

  const exitWithdrawal = () => {
    setWithdrawalState({ isShowing: false, note: null });
    handleRefresh(); // Refresh notes after exiting withdrawal form
  };

  if (withdrawalState.isShowing && withdrawalState.note) {
    return (
      <div className="flex flex-col h-full gap-2 p-2">
        <div className="flex items-center gap-3">
          <BackButton onClick={exitWithdrawal} />
          <h1 className="text-lg font-semibold text-app-primary tracking-tight">Withdraw ETH</h1>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <WithdrawalForm
            asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
            preSelectedNote={withdrawalState.note}
            onTransactionSuccess={exitWithdrawal}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-2 p-2">
      <div className="flex items-center gap-3">
        <BackButton to="home" />
        <h1 className="text-lg font-semibold text-app-primary tracking-tight">My Notes</h1>
      </div>

      <div className="space-y-2">
        <NotesSummaryCard
          unspentNotes={unspentNotesCount}
          totalNotes={totalNotesCount}
          isRediscovering={isRefreshing}
          onRediscover={handleRefresh}
          isScanning={!!progress && !progress.complete}
          scanProgress={progress || undefined}
          syncError={!!error}
          newNotesFound={noteDiscovery?.newNotesFound}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <NotesSection
          noteChains={noteChains}
          loading={loading}
          error={!!error}
          onNoteChainClick={noteChainModal.openWith}
        />
      </div>

      <NoteChainDrawer
        noteChain={noteChainModal.selectedItem}
        open={noteChainModal.isOpen}
        onOpenChange={noteChainModal.setOpen}
        onWithdrawClick={startWithdrawal}
      />
    </div>
  );
};
