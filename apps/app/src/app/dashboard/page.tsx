"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNotesController, NotesSection, type NoteChain } from "@/features/notes";
import { useModalWithSelection } from "@/hooks/useModalState";
import { NoteChainScreen } from "@/features/notes/components/NoteChainScreen";
import { AmountDisplay } from "@/components/shared/AmountDisplay";

export default function NotesPage() {
  const router = useRouter();
  const notesController = useNotesController();
  const noteChainModal = useModalWithSelection<NoteChain>(false);

  // Calculate total balance from available notes
  const totalBalance = useMemo(() => {
    return notesController.availableNotes.reduce((total, note) => {
      return total + BigInt(note.amount);
    }, BigInt(0));
  }, [notesController.availableNotes]);

  const startWithdrawal = (noteChain: NoteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (lastNote.status === "unspent" && lastNote.isActivated) {
      // Close the note details and navigate to withdrawal
      noteChainModal.setOpen(false);
      router.push("/dashboard/withdraw");
    }
  };

  // Show note chain details modal if open
  if (noteChainModal.isOpen) {
    return (
      <NoteChainScreen
        noteChain={noteChainModal.selectedItem}
        onBack={() => noteChainModal.setOpen(false)}
        onWithdrawClick={startWithdrawal}
      />
    );
  }

  return (
    <div className="h-full w-full">
      {/* Balance Section */}
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        <AmountDisplay
          amount={totalBalance}
          layout="stacked"
          ethOptions={{ decimals: 4 }}
          ethClassName="mb-1 text-3xl font-bold text-white sm:text-4xl"
          usdClassName="text-base text-gray-400"
        />
      </div>

      {/* Notes Section */}
      <NotesSection controller={notesController} onNoteChainClick={noteChainModal.openWith} />
    </div>
  );
}
