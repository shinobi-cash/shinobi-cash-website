"use client";

import { useState, useMemo } from "react";
import { FileText, Activity as ActivityIcon, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesData } from "@/hooks/notes/useNotesData";
import { NotesSection } from "../features/notes/NotesSection";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { NoteChain } from "@/lib/storage/types";
import { NoteChainScreen } from "../features/notes/NoteChainScreen";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
import { DepositForm } from "../features/deposit/DepositForm";
import { formatEther } from "viem";
import { AuthModal } from "./AuthModal";
import { Button } from "../ui/button";

export function MainCard() {
  const { isAuthenticated, publicKey, accountKey } = useAuth();
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawalOpen, setIsWithdrawalOpen] = useState(false);

  // Notes data
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const {
    noteChains,
    unspentNotesCount,
    loading: notesLoading,
    error: notesError,
    isRefreshing,
    handleRefresh,
  } = useNotesData();

  // Calculate total balance from unspent notes
  const totalBalance = useMemo(() => {
    if (!noteChains || noteChains.length === 0) return BigInt(0);

    return noteChains.reduce((total, noteChain) => {
      const lastNote = noteChain[noteChain.length - 1];
      if (lastNote.status === "unspent" && lastNote.isActivated) {
        return total + BigInt(lastNote.amount);
      }
      return total;
    }, BigInt(0));
  }, [noteChains]);

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
    handleRefresh();
  };

  const exitDeposit = () => {
    setIsDepositOpen(false);
    handleRefresh();
  };

  // Format balance for display
  const formattedBalance = formatEther(totalBalance);
  const balanceInUSD = "0.00"; // TODO: Calculate USD value when price feed is available

  return (
    <div className="overflow-scroll w-full h-full">
      {!isAuthenticated || !publicKey || !accountKey ? (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <FileText className="w-10 h-10 text-orange-600" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">Welcome to Shinobi Cash</h3>
            <p className="text-gray-400 text-base mb-8">
              Create an account or sign in to access your private wallet and manage your notes securely.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setAuthDrawerOpen(true)}
                className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors"
              >
                Get Started
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              Already have an account? Click "Get Started" to sign in.
            </p>
          </div>
        </div>
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
        <div className="w-full h-full">
          {/* Balance and Action Buttons Section */}
          <div className="flex flex-col gap-4 p-4 sm:p-6">
            {/* Balance */}
            <div className="flex justify-between items-start">
              <div className="flex flex-col">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {Number(formattedBalance).toFixed(4)} ETH
                </div>
                <div className="text-gray-400 text-base">≈ ${balanceInUSD} USD</div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" aria-label="activity"
                  onClick={() => {
                    // TODO: Show activity
                    console.log("Activity clicked");
                  }}
                >
                  <ActivityIcon className="w-4 h-4 text-white" />
                </Button>

                <Button variant="outline" size="icon" aria-label="refresh"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </div>

            {/* Deposit and Withdraw Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={() => setIsDepositOpen(true)}
                className="flex-1 h-12 text-base font-semibold rounded-xl bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                Deposit
              </Button>
              <Button
                onClick={() => setIsWithdrawalOpen(true)}
                className="flex-1 h-12 text-base font-semibold rounded-xl bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                Withdraw
              </Button>
            </div>
          </div>

          {/* Notes Section */}
          <NotesSection
            noteChains={noteChains}
            loading={notesLoading}
            error={!!notesError}
            onNoteChainClick={noteChainModal.openWith}
          />
        </div>
      )}

      {/* Auth modal for creating account / signing in */}
      <AuthModal open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} />
    </div>
  );
}
