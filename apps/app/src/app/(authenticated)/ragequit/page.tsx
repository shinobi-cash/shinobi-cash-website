"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useWalletClient } from "wagmi";
import { RagequitPreviewScreen } from "@/components/screens/RagequitPreviewScreen";
import { RagequitTimelineScreen } from "@/components/screens/RagequitTimelineScreen";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { useRagequitController } from "@/hooks/useRagequitController";
import { useNotesDiscovery } from "@/hooks/useNotesDiscovery";
import { RagequitController, RagequitSelectors } from "@/controllers/RagequitController";
import { getSpendableNotes } from "@/utils/noteFiltering";
import type { NoteChain, ChangeNote } from "@shinobi-cash/core/discovery";
import type { WalletClient, Account, Transport, Chain } from "viem";

/** Check if a note chain has any merge history (received funds from another note) */
function checkMergeHistory(noteChains: readonly (readonly unknown[])[], depositIndex: number): boolean {
  const chain = noteChains.find((nc) => {
    const firstNote = nc[0] as { depositIndex?: number } | undefined;
    return firstNote?.depositIndex === depositIndex;
  });
  if (!chain) return false;

  return chain.some((note) => {
    const changeNote = note as ChangeNote;
    return changeNote.mergedFromDepositIndex !== undefined;
  });
}

type RagequitScreen = "preview" | "timeline";

export default function RagequitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useAccount();
  const { data: walletClient } = useWalletClient();

  const screens = useScreenNavigation<RagequitScreen>();
  const state = useRagequitController();
  const discovery = useNotesDiscovery();

  // Get note index from URL params (e.g., /ragequit?note=0)
  const noteIndexParam = searchParams.get("note");

  // Auto-select note from URL param on mount
  useEffect(() => {
    if (noteIndexParam !== null && discovery.state.status === "ready") {
      const noteIndex = parseInt(noteIndexParam, 10);
      // Cast to mutable array for getSpendableNotes
      const spendableNotes = getSpendableNotes([...discovery.noteChains] as NoteChain[]);
      const note = spendableNotes.find((n) => n.depositIndex === noteIndex);
      if (note) {
        RagequitController.selectNote(note);
      }
    }
  }, [noteIndexParam, discovery.state.status, discovery.noteChains]);

  // Handle confirm from preview
  const handleConfirm = async () => {
    if (!walletClient) return;

    // Start the flow (prepare + submit)
    await RagequitController.prepare();

    if (state.state.status === "ready") {
      screens.navigate("timeline");
      await RagequitController.submit(
        walletClient as WalletClient<Transport, Chain, Account>,
      );
    }
  };

  // Handle close from timeline
  const handleTimelineClose = () => {
    RagequitController.reset();
    router.push("/notes");
  };

  // Handle back from preview
  const handleBack = () => {
    RagequitController.reset();
    router.back();
  };

  // Get transaction details
  const txHash =
    state.state.status === "confirmed" || state.state.status === "confirming"
      ? state.state.txHash
      : null;

  const hasError = state.state.status === "error";
  const error = hasError && state.state.status === "error" ? state.state.error : state.lastError;

  // Get selected note
  const selectedNote = RagequitSelectors.getSelectedNote();

  // Show timeline screen
  if (screens.is("timeline") && selectedNote) {
    return (
      <RagequitTimelineScreen
        amount={selectedNote.amount}
        status={state.state.status}
        txHash={txHash}
        error={error}
        onClose={handleTimelineClose}
      />
    );
  }

  // If no note selected, redirect back
  if (!selectedNote) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <div className="space-y-4">
          <p className="text-neutral-400">No note selected for public withdrawal.</p>
          <button
            onClick={() => router.push("/notes")}
            className="text-blue-400 hover:text-blue-300"
          >
            Go to Notes
          </button>
        </div>
      </div>
    );
  }

  // Check if this note chain has merge history
  const noteHasMergeHistory = checkMergeHistory(discovery.noteChains, selectedNote.depositIndex);

  // Default: Preview screen
  return (
    <RagequitPreviewScreen
      onBack={handleBack}
      onConfirm={handleConfirm}
      note={selectedNote}
      isProcessing={state.isInProgress}
      hasMergeHistory={noteHasMergeHistory}
    />
  );
}
