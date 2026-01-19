"use client";

import { useRouter } from "next/navigation";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { NoteChainScreen } from "@/components/screens/NoteChainScreen";
import { NotesSection } from "@/components/notes/NotesSection";
import { NoteChain } from "@shinobi-cash/core";
import { useNotesScreen } from "@/hooks/useNotesScreen";
import { NotesScreenSelectors } from "@/controllers/NotesScreenController";

export default function NotesPage() {
  const router = useRouter();
  const controller = useNotesScreen();

  const startWithdrawal = (noteChain: NoteChain) => {
    if (NotesScreenSelectors.canWithdrawFromChain(noteChain)) {
      controller.clearSelection();
      router.push("/withdraw");
    }
  };

  // Show note chain details screen
  if (controller.selectedNoteChain) {
    return (
      <NoteChainScreen
        noteChain={controller.selectedNoteChain}
        onBack={controller.clearSelection}
        onWithdrawClick={startWithdrawal}
      />
    );
  }

  return (
    <div className="flex h-[550px] w-full flex-col">
      {/* Balance Section - Fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <AmountDisplay
          amount={controller.totalBalance}
          layout="stacked"
          ethOptions={{ decimals: 4 }}
          ethClassName="mb-1 text-3xl font-bold text-white sm:text-4xl"
          usdClassName="text-base text-gray-400"
        />
      </div>

      {/* Notes Section - Scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 sm:px-6">
        <NotesSection
          controller={controller}
          onNoteChainClick={controller.selectNoteChain}
        />
      </div>
    </div>
  );
}
