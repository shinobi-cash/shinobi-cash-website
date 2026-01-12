"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AmountDisplay } from "@/components/shared/AmountDisplay";
import { NoteChainScreen } from "@/features/notes/ui/screens/NoteChainScreen";
import { NotesSection } from "@/features/notes/ui/components/NotesSection";
import { NoteChain } from "@shinobi-cash/core";
import { useNotesScreenController } from "@/features/notes/hooks/useNotesScreenController";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";

type NoteScreen = "detail";

export default function NotesPage() {
  const router = useRouter();
  const controller = useNotesScreenController();
  const screens = useScreenNavigation<NoteScreen>();

  // Calculate total balance from available notes
  const totalBalance = useMemo(() => {
    return controller.availableNotes.reduce((total, note) => {
      return total + BigInt(note.amount);
    }, BigInt(0));
  }, [controller.availableNotes]);

  const startWithdrawal = (noteChain: NoteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (lastNote.status === "unspent" && lastNote.isActivated) {
      // Close the note details and navigate to withdrawal
      screens.close();
      controller.clearSelection();
      router.push("/withdraw");
    }
  };

  // Show note chain details screen
  if (screens.is("detail") && controller.selectedNoteChain) {
    return (
      <NoteChainScreen
        noteChain={controller.selectedNoteChain}
        onBack={() => {
          screens.close();
          controller.clearSelection();
        }}
        onWithdrawClick={startWithdrawal}
      />
    );
  }

  return (
    <div className="flex h-[550px] w-full flex-col">
      {/* Balance Section - Fixed */}
      <div className="shrink-0 border-b border-gray-800 px-4 pb-4 pt-4 sm:px-6 sm:pt-6">
        <AmountDisplay
          amount={totalBalance}
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
          onNoteChainClick={(chain) => {
            controller.selectNoteChain(chain);
            screens.navigate("detail");
          }}
        />
      </div>
    </div>
  );
}
