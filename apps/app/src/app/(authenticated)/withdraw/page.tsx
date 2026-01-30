"use client";

import { Loader2, ChevronDown, ArrowUpFromLine, Banknote, Wallet, Check, X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { CardContainer } from "@/components/shared/CardContainer";
import { AssetPill } from "@/components/shared/AssetPill";
import { AmountInput } from "@/components/shared/AmountInput";
import { QuickAmountButtons } from "@/components/shared/QuickAmountButtons";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { AmountUsd } from "@/components/shared/AmountUsd";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { AssetChainSelectorScreen } from "@/components/screens/AssetChainSelectorScreen";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { NoteSelectionScreen } from "@/components/screens/NoteSelectionScreen";
import { WithdrawalPreviewScreen } from "@/components/screens/WithdrawalPreviewScreen";
import { WithdrawalTimelineScreen } from "@/components/screens/WithdrawalTimelineScreen";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { DISPLAY_DECIMALS, ETH_ASSET } from "@/constants/withdraw";
import { formatEthAmount } from "@/utils/formatters";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { useWithdrawController } from "@/hooks/useWithdrawController";
import { usePriceData } from "@/hooks/usePriceData";
import { WithdrawController, WithdrawSelectors } from "@/controllers/WithdrawController";

type WithdrawScreen = "noteSelection" | "destinationSelection" | "preview" | "timeline";

export default function WithdrawPage() {
  const asset = ETH_ASSET;

  const screens = useScreenNavigation<WithdrawScreen>();
  const [isRecipientExpanded, setIsRecipientExpanded] = useState(false);
  const recipientInputRef = useRef<HTMLInputElement>(null);

  // Read-only snapshot from controller (React adapter)
  const state = useWithdrawController();
  const { usdPrice } = usePriceData("ETH");

  // Auto-preview: Schedule lightweight fee preview when inputs change (debounced 500ms)
  useEffect(() => {
    if (WithdrawSelectors.canAutoPreview()) {
      WithdrawController.schedulePreview();
    }
  }, [state.amount, state.recipientAddress, state.selectedNote, state.destinationChainId]);

  const { trackTransaction, onTransactionIndexed } = useTransactionTracking();

  // Listen for indexed event to update controller
  useEffect(() => {
    return onTransactionIndexed(() => {
      WithdrawController.markIndexed();
    });
  }, [onTransactionIndexed]);

  // Review = navigate to preview screen
  const handleReviewWithdrawal = () => {
    screens.navigate("preview");
  };

  // Confirm = prepare + submit, then navigate to timeline
  const handleConfirmWithdrawal = () => {
    WithdrawController.confirm();
    screens.navigate("timeline");
  };

  // Handle close from timeline (after work is done)
  const handleTimelineClose = () => {
    WithdrawController.reset();
    screens.close();
  };

  // Get transaction details
  const txHash = (() => {
    if (state.state.status === "confirmed" || state.state.status === "indexed") {
      return state.state.txHash;
    }
    return null;
  })();

  // Track transaction for indexing when txHash becomes available
  useEffect(() => {
    if (txHash) {
      trackTransaction(txHash, POOL_CHAIN.id);
    }
  }, [txHash, trackTransaction]);

  const hasError = state.state.status === "error";
  const error = hasError ? state.state.error : state.lastError;

  // Show withdrawal timeline screen
  if (screens.is("timeline")) {
    return (
      <WithdrawalTimelineScreen
        amount={parseFloat(state.amount) || 0}
        status={state.state.status}
        txHash={txHash}
        error={error}
        isCrossChain={WithdrawSelectors.isCrossChain()}
        onClose={handleTimelineClose}
      />
    );
  }

  // Show withdrawal preview screen
  if (screens.is("preview")) {
    return (
      <WithdrawalPreviewScreen
        onBack={screens.close}
        onConfirm={handleConfirmWithdrawal}
        withdrawAmount={state.amount}
        executionFee={WithdrawSelectors.getExecutionFee()}
        solverFee={WithdrawSelectors.getSolverFee()}
        youReceive={WithdrawSelectors.getYouReceive()}
        recipientAddress={state.recipientAddress}
        destinationChainId={state.destinationChainId}
        isCrossChain={WithdrawSelectors.isCrossChain()}
        isProcessing={state.state.status === "submitting"}
      />
    );
  }

  // Show note selection screen
  if (screens.is("noteSelection")) {
    return (
      <NoteSelectionScreen
        availableNotes={[...state.notes.notes]}
        selectedNote={state.selectedNote}
        onSelectNote={(note) => WithdrawController.selectNote(note)}
        onBack={screens.close}
        isLoading={state.notes.isLoading}
        asset={asset}
      />
    );
  }

  // Show destination selection screen
  if (screens.is("destinationSelection")) {
    return (
      <ScreenLayout containerClassName="h-[600px]" header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}>
        <AssetChainSelectorScreen
          selectedChainId={state.destinationChainId}
          onChainChange={(newChainId) => {
            WithdrawController.setDestinationChain(newChainId);
          }}
          onSelect={screens.close}
        />
      </ScreenLayout>
    );
  }

  // Main Withdrawal Form
  const isProcessing = state.state.status === "preparing" || state.state.status === "submitting";
  const isDisabled = !state.selectedNote || isProcessing;

  // Convert note amount from wei string to ETH number
  const noteBalance = state.selectedNote
    ? parseFloat(formatEthAmount(state.selectedNote.amount))
    : 0;

  // Calculate USD values
  const youReceiveAmount = WithdrawSelectors.getYouReceive();
  const youReceiveUsd = usdPrice && youReceiveAmount > 0 ? youReceiveAmount * usdPrice : null;

  // Quick amount handler
  const handleQuickAmount = (percentage: number) => {
    if (noteBalance > 0) {
      const amount = (noteBalance * percentage).toFixed(6);
      WithdrawController.setAmount(amount);
    }
  };

  return (
    <ScreenLayout
      header={<ScreenHeader title="Withdraw" icon={<ArrowUpFromLine className="h-5 w-5" />} />}
      contentClassName="px-4 py-4 sm:px-6"
    >
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="relative flex flex-col gap-2">
          {/* You Pay */}
          <CardContainer>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-neutral-400">You Pay</span>
              <div className="flex items-center gap-2">
                {state.selectedNote && (
                  <span className="text-sm text-neutral-400">
                    {noteBalance.toFixed(DISPLAY_DECIMALS)} {asset.symbol}
                  </span>
                )}
                <button
                  onClick={() => screens.navigate("noteSelection")}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isProcessing}
                >
                  <Banknote className="h-3 w-3" />
                  {state.selectedNote
                    ? `Note #${state.selectedNote.depositIndex + 1}`
                    : "Select Note"}
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <AssetPill asset={asset} chainId={POOL_CHAIN.id} disabled />
              <AmountInput
                value={state.amount}
                onChange={(value) => WithdrawController.setAmount(value)}
                disabled={isDisabled}
              />
            </div>

            <div className="flex items-center justify-end">
              <QuickAmountButtons
                onSelect={handleQuickAmount}
                disabled={isDisabled || noteBalance <= 0}
              />
            </div>
          </CardContainer>

          <SectionDivider />

          {/* You Receive */}
          <CardContainer>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">You Receive</span>
              {isRecipientExpanded ? (
                <div className="flex items-center gap-1">
                  <input
                    ref={recipientInputRef}
                    type="text"
                    value={state.recipientAddress}
                    onChange={(e) => WithdrawController.setRecipientAddress(e.target.value)}
                    onBlur={() => setIsRecipientExpanded(false)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === "Escape") {
                        setIsRecipientExpanded(false);
                      }
                    }}
                    placeholder="0x... or ENS"
                    autoFocus
                    className={`w-48 rounded-lg border bg-white/[0.04] px-2 py-1 text-sm text-white placeholder:text-neutral-500 focus:outline-none ${
                      WithdrawSelectors.getAddressError()
                        ? "border-red-500 focus:border-red-500"
                        : "border-white/20 focus:border-white/50"
                    }`}
                  />
                  {state.recipientAddress && (
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => WithdrawController.setRecipientAddress("")}
                      className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setIsRecipientExpanded(false)}
                    className="rounded-full p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsRecipientExpanded(true);
                    setTimeout(() => recipientInputRef.current?.focus(), 0);
                  }}
                  className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isDisabled}
                >
                  <Wallet className="h-3 w-3" />
                  {state.recipientAddress
                    ? `${state.recipientAddress.slice(0, 6)}...${state.recipientAddress.slice(-4)}`
                    : "Enter Recipient"}
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <AssetPill
                asset={asset}
                chainId={state.destinationChainId}
                onClick={() => screens.navigate("destinationSelection")}
                disabled={isDisabled}
              />
              <AmountInput
                value={youReceiveAmount > 0 ? youReceiveAmount.toFixed(DISPLAY_DECIMALS) : state.amount || "0"}
                disabled
              />
            </div>

            <div className="flex items-center justify-between py-1">
              <PriceDisplay symbol={asset.symbol} priceUsd={usdPrice} />
              <AmountUsd amountUsd={youReceiveUsd} />
            </div>
          </CardContainer>
        </div>

        <Button
          onClick={handleReviewWithdrawal}
          disabled={!WithdrawSelectors.canWithdraw()}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          {state.state.status === "previewing" ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Previewing fees...
            </div>
          ) : !state.selectedNote ? (
            "Select a Note"
          ) : !state.amount.trim() ? (
            "Enter Amount"
          ) : !state.recipientAddress ? (
            "Enter Recipient Address"
          ) : (
            "Review Withdrawal"
          )}
        </Button>

        {state.previewFeeQuote && (
          <FeeBreakdown
            executionFee={WithdrawSelectors.getExecutionFee()}
            solverFee={WithdrawSelectors.getSolverFee()}
            assetSymbol={asset.symbol}
            isCrossChain={WithdrawSelectors.isCrossChain()}
            showAsDeduction={true}
          />
        )}
      </div>
    </ScreenLayout>
  );
}
