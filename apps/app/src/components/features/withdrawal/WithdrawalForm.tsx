import { useAuth } from "@/contexts/AuthContext";
import { useWithdrawal } from "@/hooks/withdrawal/useWithdrawal";
import type { Note } from "@/lib/storage/types";
import { calculateWithdrawalAmounts } from "@/services/withdrawal/helpers";
import { formatEthAmount } from "@/utils/formatters";
import { Loader2, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNoteSelection, useWithdrawalFormState } from "../../../hooks/withdrawal/useWithdrawalFormHooks";
import { Button } from "../../ui/button";
import { NoteSelectionScreen } from "./NoteSelectionScreen";
import { WithdrawalTimelineScreen } from "./WithdrawalTimelineScreen";
import { POOL_CHAIN, SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { BackButton } from "../../ui/back-button";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenBalance } from "@/components/shared/TokenBalance";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { RecipientAddressInputScreen } from "@/components/shared/RecipientAddressInputScreen";
import { WithdrawalFeeBreakdown } from "@/components/shared/WithdrawalFeeBreakdown";

interface WithdrawalFormProps {
  onTransactionSuccess?: () => void;
  onBack?: () => void;
}

const ETH_ASSET = {
  symbol: "ETH",
  name: "Ethereum",
  icon: "/ethereum.svg",
};

export function WithdrawalForm({ onTransactionSuccess, onBack }: WithdrawalFormProps) {
  const asset = ETH_ASSET;
  const { publicKey, accountKey } = useAuth();
  const poolAddress = SHINOBI_CASH_ETH_POOL.address;
  const [isDestinationSelectionOpen, setIsDestinationSelectionOpen] = useState(false);
  const [isRecipientAddressInputOpen, setIsRecipientAddressInputOpen] = useState(false);
  const [isNoteSelectionOpen, setIsNoteSelectionOpen] = useState(false);

  // TypeScript assertion: AuthenticationGate ensures these values exist
  if (!publicKey || !accountKey) {
    throw new Error("WithdrawalForm: Missing auth values despite AuthenticationGate");
  }

  // Use custom hook to handle note discovery and selection logic
  const { availableNotes, selectedNote, setSelectedNote, isLoadingNotes } = useNoteSelection(
    publicKey,
    poolAddress,
    null, // Always start with no note selected
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

  const noteBalance = selectedNote ? formatEthAmount(selectedNote.amount) : "0";

  // Show withdrawal timeline screen
  if (showTimeline && selectedNote) {
    return (
      <WithdrawalTimelineScreen
        onBack={closeTimeline}
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
        showPreview={showPreviewMode}
        onShowPreview={handleShowPreview}
      />
    );
  }

  // Show note selection screen
  if (isNoteSelectionOpen) {
    return (
      <NoteSelectionScreen
        availableNotes={availableNotes}
        selectedNote={selectedNote}
        onSelectNote={setSelectedNote}
        onBack={() => setIsNoteSelectionOpen(false)}
        isLoading={isLoadingNotes}
        asset={asset}
      />
    );
  }

  // Show recipient address input screen
  if (isRecipientAddressInputOpen) {
    return (
      <RecipientAddressInputScreen
        value={form.toAddress}
        onChange={handleAddressChange}
        error={validationErrors.toAddress}
        onBack={() => setIsRecipientAddressInputOpen(false)}
        onConfirm={() => setIsRecipientAddressInputOpen(false)}
      />
    );
  }

  // Show destination selection screen (chain/asset only)
  if (isDestinationSelectionOpen) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <BackButton onClick={() => setIsDestinationSelectionOpen(false)} />
          <h2 className="text-lg font-semibold text-white">Select Asset & Chain</h2>
        </div>

        <AssetChainSelectorScreen
          selectedChainId={form.destinationChainId}
          selectedAsset={asset}
          onSelect={(newChainId) => {
            handleDestinationChainChange(newChainId);
            setIsDestinationSelectionOpen(false);
          }}
          onBack={() => {}} // Embedded, no back action
        />
      </div>
    );
  }

  // Show withdrawal form
  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <BackButton onClick={onBack} />
          <h2 className="text-lg font-semibold text-white">Withdraw</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {/* You Pay Section - From Note (Pool Chain) */}
      <TokenAmountInput
        label="You Pay"
        labelRight={
          <Button
            onClick={() => setIsNoteSelectionOpen(true)}
            variant={'ghost'}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 h-auto p-0"
            disabled={isPreparing || isExecuting}
          >
            {selectedNote ? (
              <>
                {Number.parseFloat(formatEthAmount(selectedNote.amount)).toFixed(4)} {asset.symbol}
                <ChevronDown className="w-3 h-3" />
              </>
            ) : (
              <>
                Select note
                <ChevronDown className="w-3 h-3" />
              </>
            )}
          </Button>
        }
        amount={form.withdrawAmount}
        onAmountChange={handleAmountChange}
        disabled={isPreparing || isExecuting || !selectedNote}
        rightElement={
          <TokenChainSelector
            asset={asset}
            chainId={POOL_CHAIN.id}
            showChevron={false}
          />
        }
      />

      {/* Balance and Max */}
      {selectedNote && (
        <TokenBalance
          balance={noteBalance}
          usdValue={(Number.parseFloat(noteBalance) * 0).toString()}
          assetSymbol={asset.symbol}
          onMaxClick={handleMaxClick}
          disabled={isPreparing || isExecuting}
        />
      )}

      {/* Error Message */}
      {validationErrors.amount && (
        <p className="text-red-500 text-sm mt-1">{validationErrors.amount}</p>
      )}

      {/* Arrow/Divider */}
      <SectionDivider />

      {/* Destination Section - Receive */}
      {/* You Receive Section - To Destination Chain */}
      <TokenAmountInput
        label="You Receive"
        labelRight={
          <Button
            onClick={() => setIsRecipientAddressInputOpen(true)}
            variant={'ghost'}
            className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 h-auto p-0"
            disabled={isPreparing || isExecuting || !selectedNote}
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
          </Button>
        }
        amount={youReceive > 0 ? youReceive.toFixed(4) : form.withdrawAmount || "0.0000"}
        onAmountChange={() => {}} // Read-only
        disabled={isPreparing || isExecuting}
        readOnly={true}
        rightElement={
          <TokenChainSelector
            asset={asset}
            chainId={form.destinationChainId}
            onClick={() => setIsDestinationSelectionOpen(true)}
            disabled={isPreparing || isExecuting || !selectedNote}
            showChevron={true}
          />
        }
      />

      {/* Fee Breakdown */}
      <WithdrawalFeeBreakdown
        withdrawalAmount={withdrawAmountNum}
        executionFee={executionFee}
        solverFee={solverFee}
        youReceive={youReceive}
        assetSymbol={asset.symbol}
        isCrossChain={isCrossChain}
      />

      {/* Action Button */}
      <div className="mt-2 sm:mt-4">
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
      </div>
    </div>
  );
}
