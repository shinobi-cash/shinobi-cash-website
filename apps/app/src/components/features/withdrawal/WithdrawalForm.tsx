import { useAuth } from "@/contexts/AuthContext";
import { useWithdrawal } from "@/hooks/withdrawal/useWithdrawal";
import type { Note } from "@/lib/storage/types";
import { calculateWithdrawalAmounts } from "@/services/withdrawal/helpers";
import { formatEthAmount } from "@/utils/formatters";
import { Loader2, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNoteSelection, useWithdrawalFormState } from "../../../hooks/withdrawal/useWithdrawalFormHooks";
import { Button } from "../../ui/button";
import { NoteSelector } from "./NoteSelector";
import { WithdrawalTimelineDrawer } from "./WithdrawalTimelineDrawer";
import { SHINOBI_CASH_ETH_POOL, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import Image from "next/image";
import { BackButton } from "../../ui/back-button";

interface WithdrawalFormProps {
  preSelectedNote?: Note | null;
  onTransactionSuccess?: () => void;
}

const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export function WithdrawalForm({ preSelectedNote, onTransactionSuccess }: WithdrawalFormProps) {
  const asset = ETH_ASSET;
  const { publicKey, accountKey } = useAuth();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;
  const [isDestinationSelectionOpen, setIsDestinationSelectionOpen] = useState(false);

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("WithdrawalForm: Missing auth values despite AuthenticationGate");
  }

  // Use custom hook to handle note discovery and selection logic
  const { availableNotes, selectedNote, setSelectedNote, isLoadingNotes } = useNoteSelection(
    publicKey,
    poolAddress,
    preSelectedNote,
  );

  // Use custom hook to manage form state and validation
  const { form, validationErrors, handleAmountChange, handleAddressChange, handleMaxClick, resetForm, handleDestinationChainChange } =
    useWithdrawalFormState(selectedNote, asset);

  // Derived state from form values
  const withdrawAmountNum = Number.parseFloat(form.withdrawAmount) || 0;
  const isValidAmount = !validationErrors.amount && withdrawAmountNum > 0;
  const isValidAddress = !validationErrors.toAddress;

  // Withdrawal flow hook - only works when we have a selected note
  const withdrawalFlow = useWithdrawal({
    note: selectedNote || ({} as Note), // Use a more robust mock or null check
    destinationChainId: form.destinationChainId,
    onTransactionSuccess,
  });

  // Derived state for timeline drawer
  const withdrawalAmounts = useMemo(() => {
    return form.withdrawAmount
      ? calculateWithdrawalAmounts(form.withdrawAmount, form.destinationChainId)
      : { executionFee: 0, solverFee: 0, youReceive: 0, isCrossChain: false };
  }, [form.withdrawAmount, form.destinationChainId]);

  const { executionFee, solverFee, youReceive, isCrossChain } = withdrawalAmounts;
  const remainingBalance = useMemo(
    () => (selectedNote?.amount ? Number.parseFloat(formatEthAmount(selectedNote.amount)) - withdrawAmountNum : 0),
    [selectedNote, withdrawAmountNum],
  );

  const {
    isPreparing,
    isExecuting,
    showTimeline,
    steps,
    showPreviewMode,
    handlePreviewWithdrawal,
    handleExecuteTransaction,
    closeTimeline,
    handleShowPreview,
    resetStates,
  } = withdrawalFlow;

  // Reset states when selected note changes
  useEffect(() => {
    resetStates();
    resetForm();
  }, [resetStates, resetForm]);

  const handleSubmit = useCallback(() => {
    if (selectedNote && isValidAmount && isValidAddress) {
      handlePreviewWithdrawal(form.withdrawAmount, form.toAddress);
    }
  }, [selectedNote, isValidAmount, isValidAddress, handlePreviewWithdrawal, form.withdrawAmount, form.toAddress]);

  // ---- Chain Icon Helper ----
  const getChainIcon = (id: number) => {
    const chainIconMap: Record<number, string> = {
      // Mainnets
      1: "/chains/eth-diamond-black-white.svg",
      8453: "/chains/Base_square_blue.svg",
      10: "/chains/OPMainnet_square.svg",
      42161: "/chains/AF_logomark.svg",
      // Testnets
      421614: "/chains/AF_logomark.svg",
      84532: "/chains/Base_square_blue.svg",
      11155111: "/chains/eth-diamond-black-white.svg",
      11155420: "/chains/OPMainnet_square.svg",
    };
    return chainIconMap[id] || "/chains/eth-diamond-black-white.svg";
  };

  const getCurrentDestinationChain = () => {
    return SHINOBI_CASH_SUPPORTED_CHAINS.find((chain) => chain.id === form.destinationChainId);
  };

  const destinationChain = getCurrentDestinationChain();

  const noteBalance = selectedNote ? formatEthAmount(selectedNote.amount) : "0";

  // Show destination selection screen
  if (isDestinationSelectionOpen) {
    return (
      <div className="flex flex-col px-4 sm:px-6 py-6">
        <div className="flex items-center gap-3 mb-6">
          <BackButton onClick={() => setIsDestinationSelectionOpen(false)} />
          <h2 className="text-lg font-semibold text-white">Select Destination</h2>
        </div>

        <div className="space-y-6">
          {/* Chain Selection */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 block">Chain</label>
            <div className="grid grid-cols-2 gap-2">
              {SHINOBI_CASH_SUPPORTED_CHAINS.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleDestinationChainChange(chain.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-colors ${
                    form.destinationChainId === chain.id
                      ? "bg-purple-600/20 border-purple-600"
                      : "bg-gray-800 border-gray-700 hover:bg-gray-700"
                  }`}
                >
                  <Image
                    src={getChainIcon(chain.id)}
                    alt={chain.name}
                    width={20}
                    height={20}
                    className="w-5 h-5"
                  />
                  <span className="text-sm font-medium text-white">{chain.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recipient Address */}
          <div>
            <label className="text-sm font-medium text-gray-400 mb-3 block">Recipient Address</label>
            <div className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  value={form.toAddress}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="Address or ENS"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-purple-600 transition-colors pr-20"
                />
                <button
                  onClick={() => {
                    if (navigator.clipboard) {
                      navigator.clipboard.readText().then((text) => {
                        handleAddressChange(text);
                      });
                    }
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  Paste
                </button>
              </div>
              {validationErrors.toAddress && (
                <p className="text-red-500 text-sm">{validationErrors.toAddress}</p>
              )}
            </div>
          </div>

          {/* Confirm Button */}
          <Button
            onClick={() => setIsDestinationSelectionOpen(false)}
            disabled={!form.toAddress || !!validationErrors.toAddress}
            className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl"
          >
            Confirm
          </Button>
        </div>
      </div>
    );
  }

  // Show withdrawal form
  return (
    <div className="flex flex-col px-4 sm:px-6 py-6">
      {/* Source Section - Pay */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm text-gray-400">Pay</label>
          {/* Note Selector inline with label */}
          <NoteSelector
            availableNotes={availableNotes}
            selectedNote={selectedNote}
            setSelectedNote={setSelectedNote}
            isLoadingNotes={isLoadingNotes}
            preSelectedNote={preSelectedNote}
            asset={asset}
          />
        </div>

        {/* Chain + Asset Selector */}
        {selectedNote && (
          <>
            <button
              onClick={() => setIsDestinationSelectionOpen(true)}
              className="flex items-center gap-2 mb-4"
              disabled={isPreparing || isExecuting}
            >
              {/* Chain icon */}
              <Image
                src={getChainIcon(form.destinationChainId)}
                alt={destinationChain?.name || "Chain"}
                width={24}
                height={24}
                className="w-6 h-6 rounded-full"
              />
              {/* Asset icon */}
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                <Image
                  src={asset.icon}
                  alt={asset.symbol}
                  width={16}
                  height={16}
                  className="w-4 h-4"
                />
              </div>
              <span className="text-base font-medium text-white">{asset.symbol}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {/* Amount Input */}
            <input
              type="number"
              value={form.withdrawAmount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0"
              className="w-full px-0 py-2 bg-transparent border-none text-white text-5xl font-semibold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              disabled={isPreparing || isExecuting}
            />

            {/* Balance and Max */}
            <div className="flex items-center justify-between mt-3">
              <span className="text-sm text-gray-400">
                ${(Number.parseFloat(noteBalance) * 0).toFixed(2)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">
                  Balance {Number.parseFloat(noteBalance).toFixed(4)}
                </span>
                <button
                  onClick={handleMaxClick}
                  className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                  disabled={isPreparing || isExecuting}
                >
                  MAX
                </button>
              </div>
            </div>

            {validationErrors.amount && (
              <p className="text-red-500 text-sm mt-2">{validationErrors.amount}</p>
            )}
          </>
        )}
      </div>

      {/* Arrow/Divider */}
      {selectedNote && (
        <div className="flex justify-center my-4">
          <div className="bg-gray-900 border border-gray-700 rounded-full p-2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      )}

      {/* Destination Section - Receive */}
      {selectedNote && (
        <div className="mb-6">
          {/* Label with Recipient Selector */}
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm text-gray-400">Receive</label>
            <button
              onClick={() => setIsDestinationSelectionOpen(true)}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
              disabled={isPreparing || isExecuting}
            >
              {form.toAddress ? (
                <>
                  {form.toAddress.slice(0, 6)}...{form.toAddress.slice(-4)}
                  <ChevronDown className="w-3 h-3" />
                </>
              ) : (
                <>
                  Select recipient
                  <ChevronDown className="w-3 h-3" />
                </>
              )}
            </button>
          </div>

          {/* Chain + Asset Selector */}
          <button
            onClick={() => setIsDestinationSelectionOpen(true)}
            className="flex items-center gap-2 mb-4"
            disabled={isPreparing || isExecuting}
          >
            {/* Chain icon */}
            <Image
              src={getChainIcon(form.destinationChainId)}
              alt={destinationChain?.name || "Chain"}
              width={24}
              height={24}
              className="w-6 h-6 rounded-full"
            />
            {/* Asset icon */}
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
              <Image
                src={asset.icon}
                alt={asset.symbol}
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </div>
            <span className="text-base font-medium text-white">{asset.symbol}</span>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {/* Receive Amount */}
          <div className="text-5xl font-semibold text-white mb-3">
            {form.withdrawAmount || "0"}
          </div>

          {/* USD Value */}
          <div className="text-sm text-gray-400">
            ${(Number.parseFloat(form.withdrawAmount || "0") * 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6 sm:mt-8">
        <Button
          onClick={handleSubmit}
          disabled={!selectedNote || !isValidAmount || !isValidAddress || isPreparing || isExecuting}
          className="w-full h-12 sm:h-14 rounded-xl text-base sm:text-lg font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {isPreparing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Preparing...
            </>
          ) : isExecuting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Executing...
            </>
          ) : !selectedNote ? (
            "Select Note to Continue"
          ) : !form.toAddress || validationErrors.toAddress ? (
            "Continue"
          ) : (
            "Preview Withdrawal"
          )}
        </Button>
      </div>

      {/* Withdrawal Timeline Drawer */}
      {showTimeline && selectedNote && (
        <WithdrawalTimelineDrawer
          isOpen={showTimeline}
          onClose={closeTimeline}
          onConfirm={handleExecuteTransaction}
          note={selectedNote}
          withdrawAmount={form.withdrawAmount}
          recipientAddress={form.toAddress}
          destinationChainId={form.destinationChainId}
          executionFee={executionFee}
          solverFee={solverFee}
          youReceive={youReceive}
          remainingBalance={remainingBalance}
          isProcessing={isExecuting}
          isCrossChain={isCrossChain}
          steps={steps}
          currentStep={steps.findIndex((s) => s.status === "processing")}
          showPreview={showPreviewMode}
          onShowPreview={handleShowPreview}
        />
      )}
    </div>
  );
}
