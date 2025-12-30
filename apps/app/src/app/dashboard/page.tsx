"use client";

import { useMemo } from "react";
import { Activity as ActivityIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotesController, NotesSection, type NoteChain } from "@/features/notes";
import { useModalWithSelection } from "@/hooks/useModalState";
import { NoteChainScreen } from "@/features/notes/components/NoteChainScreen";
import { Button } from "@workspace/ui/components/button";
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
      {/* Balance and Action Buttons Section */}
      <div className="flex flex-col gap-4 p-4 sm:p-6">
        {/* Balance */}
        <div className="flex items-start justify-between">
          <AmountDisplay
            amount={totalBalance}
            layout="stacked"
            ethOptions={{ decimals: 4 }}
            ethClassName="mb-1 text-3xl font-bold text-white sm:text-4xl"
            usdClassName="text-base text-gray-400"
          />

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="activity"
              onClick={() => {
                // TODO: Navigate to activity page
                console.log("Activity clicked");
              }}
            >
              <ActivityIcon className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Deposit and Withdraw Buttons */}
        <div className="flex gap-3">
          <Button
            variant="default"
            onClick={() => router.push("/dashboard/deposit")}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
            size="lg"
          >
            Deposit
          </Button>
          <Button
            variant="default"
            onClick={() => router.push("/dashboard/withdraw")}
            className="h-12 flex-1 rounded-xl text-base font-semibold"
            size="lg"
          >
            Withdraw
          </Button>
        </div>
      </div>

      {/* Notes Section */}
      <NotesSection controller={notesController} onNoteChainClick={noteChainModal.openWith} />
    </div>
  );
}
