"use client";

import { useState, useMemo } from "react";
import { Activity as ActivityIcon, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesController, NotesSection, type NoteChain } from "@/features/notes";
import { useModalWithSelection } from "@/hooks/useModalState";
import { NoteChainScreen } from "../features/notes/components/NoteChainScreen";
import { WithdrawalForm } from "@/features/withdraw";
import { DepositForm } from "@/features/deposit";
import { formatEther } from "viem";
import { AuthScreen } from "./AuthScreen";
import { Button } from "@workspace/ui/components/button";

export function MainCard() {
  const { isAuthenticated, publicKey, accountKey } = useAuth();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  // Notes data - uses controller now
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const notesController = useNotesController();

  // Calculate total balance from available notes
  const totalBalance = useMemo(() => {
    return notesController.availableNotes.reduce((total, note) => {
      return total + BigInt(note.amount);
    }, BigInt(0));
  }, [notesController.availableNotes]);

  const startWithdrawal = (noteChain: NoteChain) => {
    const lastNote = noteChain[noteChain.length - 1];
    if (lastNote.status === "unspent" && lastNote.isActivated) {
      // Close the note details and open withdrawal screen
      noteChainModal.setOpen(false);
      setIsWithdrawalOpen(true);
    }
  };

  const exitWithdrawal = () => {
    setIsWithdrawalOpen(false);
    notesController.refresh();
  };

  const exitDeposit = () => {
    setIsDepositOpen(false);
    notesController.refresh();
  };

  // Format balance for display
  const formattedBalance = formatEther(totalBalance);
  const balanceInUSD = "0.00"; // TODO: Calculate USD value when price feed is available

  return (
    <div className="h-full w-full">
      {!isAuthenticated || !publicKey || !accountKey ? (
        <AuthScreen />
      ) : isDepositOpen ? (
        <DepositForm
          asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
          onTransactionSuccess={exitDeposit}
          onBack={() => setIsDepositOpen(false)}
        />
      ) : isWithdrawalOpen ? (
        <WithdrawalForm
          onTransactionSuccess={exitWithdrawal}
          onBack={() => setIsWithdrawalOpen(false)}
        />
      ) : noteChainModal.isOpen ? (
        <NoteChainScreen
          noteChain={noteChainModal.selectedItem}
          onBack={() => noteChainModal.setOpen(false)}
          onWithdrawClick={startWithdrawal}
        />
      ) : (
        <div className="h-full w-full">
          {/* Balance and Action Buttons Section */}
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {/* Balance */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col">
                <div className="mb-1 text-3xl font-bold text-white sm:text-4xl">
                  {Number(formattedBalance).toFixed(4)} ETH
                </div>
                <div className="text-base text-gray-400">≈ ${balanceInUSD} USD</div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="activity"
                  onClick={() => {
                    // TODO: Show activity
                    console.log("Activity clicked");
                  }}
                >
                  <ActivityIcon className="h-4 w-4 text-white" />
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  aria-label="refresh"
                  onClick={notesController.refresh}
                  disabled={notesController.isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 text-white ${notesController.isRefreshing ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
            </div>

            {/* Deposit and Withdraw Buttons */}
            <div className="flex gap-3">
              <Button
                variant={"default"}
                onClick={() => setIsDepositOpen(true)}
                className="h-12 flex-1 rounded-xl text-base font-semibold"
                size="lg"
              >
                Deposit
              </Button>
              <Button
                variant={"default"}
                onClick={() => setIsWithdrawalOpen(true)}
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
      )}
    </div>
  );
}
