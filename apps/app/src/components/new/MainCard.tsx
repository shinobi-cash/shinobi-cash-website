"use client";

import { useState, useMemo } from "react";
import { DollarSign, Send, FileText, Activity as ActivityIcon, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotesData } from "@/hooks/notes/useNotesData";
import { NotesSection } from "../features/notes/NotesSection";
import { useModalWithSelection } from "@/hooks/ui/useModalState";
import type { Note, NoteChain } from "@/lib/storage/types";
import { NoteChainDrawer } from "../features/notes/NoteChainDrawer";
import { WithdrawalForm } from "../features/withdrawal/WithdrawalForm";
import { DepositForm } from "../features/deposit/DepositForm";
import { BackButton } from "../ui/back-button";
import { formatEther } from "viem";
import { AuthModal } from "./AuthModal";

const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export function MainCard() {
  const { isAuthenticated, publicKey, accountKey } = useAuth();
  const [authDrawerOpen, setAuthDrawerOpen] = useState(false);

  // Notes data
  const noteChainModal = useModalWithSelection<NoteChain>(false);
  const {
    noteChains,
    unspentNotesCount,
    totalNotesCount,
    loading: notesLoading,
    error: notesError,
    progress,
    isRefreshing,
    noteDiscovery,
    handleRefresh,
  } = useNotesData();

  const [withdrawalState, setWithdrawalState] = useState<{
    isShowing: boolean;
    note: Note | null;
  }>({
    isShowing: false,
    note: null,
  });

  const [depositState, setDepositState] = useState<{
    isShowing: boolean;
  }>({
    isShowing: false,
  });

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
      setWithdrawalState({ isShowing: true, note: lastNote });
      noteChainModal.setOpen(false);
    }
  };

  const exitWithdrawal = () => {
    setWithdrawalState({ isShowing: false, note: null });
    handleRefresh();
  };

  const startDeposit = () => {
    setDepositState({ isShowing: true });
  };

  const exitDeposit = () => {
    setDepositState({ isShowing: false });
    handleRefresh();
  };

  // Format balance for display
  const formattedBalance = formatEther(totalBalance);
  const balanceInUSD = "0.00"; // TODO: Calculate USD value when price feed is available

  return (
    <div className="w-full md:max-w-2xl lg:max-w-4xl mx-auto h-full max-h-full flex flex-col">
      <div className="bg-gray-900/80 backdrop-blur-md border border-gray-800 rounded-2xl shadow-xl overflow-hidden flex flex-col flex-1 min-h-0">
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
        ) : depositState.isShowing ? (
          <div className="flex flex-col h-full gap-2 p-4">
            <div className="flex items-center gap-3 mb-2">
              <BackButton onClick={exitDeposit} />
              <h2 className="text-lg font-semibold text-white">Deposit ETH</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <DepositForm
                asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
                onTransactionSuccess={exitDeposit}
              />
            </div>
          </div>
        ) : withdrawalState.isShowing && withdrawalState.note ? (
          <div className="flex flex-col h-full gap-2 p-4">
            <div className="flex items-center gap-3 mb-2">
              <BackButton onClick={exitWithdrawal} />
              <h2 className="text-lg font-semibold text-white">Withdraw ETH</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              <WithdrawalForm
                asset={{ symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" }}
                preSelectedNote={withdrawalState.note}
                onTransactionSuccess={exitWithdrawal}
              />
            </div>
          </div>
        ) : (
          <>
            {/* Balance and Action Buttons Section */}
            <div className="shrink-0 flex items-center justify-between gap-4 p-4 sm:p-6 border-b border-gray-800">
              {/* Balance - Left */}
              <div className="flex-1">
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {Number(formattedBalance).toFixed(4)} ETH
                </div>
                <div className="text-gray-400 text-base">≈ ${balanceInUSD} USD</div>
              </div>

              {/* Action Buttons - Right (2x2 Grid) */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                  onClick={startDeposit}
                >
                  <DollarSign className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white whitespace-nowrap">Deposit</span>
                </button>

                <button
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
                  onClick={() => {
                    // TODO: Show activity
                    console.log("Activity clicked");
                  }}
                >
                  <ActivityIcon className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white whitespace-nowrap">Activity</span>
                </button>

                <button
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => {
                    // Show withdraw UI if there are unspent notes
                    if (unspentNotesCount > 0 && noteChains.length > 0) {
                      const firstUnspentChain = noteChains.find((chain) => {
                        const lastNote = chain[chain.length - 1];
                        return lastNote.status === "unspent" && lastNote.isActivated;
                      });
                      if (firstUnspentChain) {
                        startWithdrawal(firstUnspentChain);
                      }
                    }
                  }}
                  disabled={unspentNotesCount === 0}
                >
                  <Send className="w-4 h-4 text-white" />
                  <span className="text-sm font-medium text-white whitespace-nowrap">Withdraw</span>
                </button>

                <button
                  className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="text-sm font-medium text-white whitespace-nowrap">Sync</span>
                </button>
              </div>
            </div>

            {/* Notes Content */}
            <div className="flex-1 overflow-y-auto">
              <NotesSection
                noteChains={noteChains}
                loading={notesLoading}
                error={!!notesError}
                onNoteChainClick={noteChainModal.openWith}
              />
            </div>

            <NoteChainDrawer
              noteChain={noteChainModal.selectedItem}
              open={noteChainModal.isOpen}
              onOpenChange={noteChainModal.setOpen}
              onWithdrawClick={startWithdrawal}
            />
          </>
        )}

        {/* Auth modal for creating account / signing in */}
        <AuthModal open={authDrawerOpen} onOpenChange={setAuthDrawerOpen} />
      </div>
    </div>
  );
}
