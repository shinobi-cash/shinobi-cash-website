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
import { traverseTree, getSpendableNotes, type NoteTree, type ChangeNote } from "@shinobi-cash/core/discovery";
import type { WalletClient, Account, Transport, Chain } from "viem";

/** Check if a note tree has any merge history (received funds from another note) */
function checkMergeHistory(noteTrees: NoteTree[], depositIndex: number): boolean {
  const tree = noteTrees.find((t) => t.root.note.depositIndex === depositIndex);
  if (!tree) return false;

  let hasMerge = false;
  traverseTree(tree, (node) => {
    // Check if this is a ChangeNote with merge history
    if (node.note.noteType === "change") {
      const changeNote = node.note as ChangeNote;
      if (Object.keys(changeNote.mergedFrom).length > 0) {
        hasMerge = true;
      }
    }
  });
  return hasMerge;
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
      const spendableNotes = getSpendableNotes(discovery.noteTrees as NoteTree[]);
      const note = spendableNotes.find((n) => n.depositIndex === noteIndex);
      if (note) {
        RagequitController.selectNote(note);
      }
    }
  }, [noteIndexParam, discovery.state.status, discovery.noteTrees]);

  // Handle confirm from preview
  const handleConfirm = async () => {
    if (!walletClient) return;

    // Navigate to timeline first to show progress
    screens.navigate("timeline");

    // Start the flow (prepare + submit)
    await RagequitController.prepare();

    // Check controller state directly (not stale snapshot)
    if (RagequitController.state.state.status === "ready") {
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
          <p className="text-neutral-400">No note selected for ragequit.</p>
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

  // Check if this note tree has merge history
  const noteHasMergeHistory = checkMergeHistory(discovery.noteTrees as NoteTree[], selectedNote.depositIndex);

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
