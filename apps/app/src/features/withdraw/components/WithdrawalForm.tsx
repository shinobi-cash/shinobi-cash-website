/**
 * Withdrawal Form - Refactored
 * Pure UI component that delegates all logic to useWithdrawController
 */

import { Loader2, ChevronDown } from "lucide-react";
import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { BackButton } from "@/components/ui/back-button";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenAmountInputWithBalance } from "@/components/shared/TokenAmountInputWithBalance";
import { InputLabel } from "@/components/shared/InputLabel";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { RecipientAddressInputScreen } from "@/components/shared/RecipientAddressInputScreen";
import { WithdrawalFeeBreakdown } from "@/components/shared/WithdrawalFeeBreakdown";
import { NoteSelectionScreen } from "./NoteSelectionScreen";
import { WithdrawalTimelineScreen } from "./WithdrawalTimelineScreen";
import { useWithdrawController } from "../controller/useWithdrawController";
import { WITHDRAW_STATUS_LABELS } from "../types";
import { ETH_ASSET, DISPLAY_DECIMALS } from "../constants";
import { showToast } from "@/lib/toast";
import { getUserMessage } from "@/lib/errors/errorHandler";

interface WithdrawalFormProps {
  onTransactionSuccess?: () => void;
  onBack?: () => void;
}

export function WithdrawalForm({ onTransactionSuccess, onBack }: WithdrawalFormProps) {
  const asset = ETH_ASSET;
  const [isNoteSelectionOpen, setIsNoteSelectionOpen] = useState(false);
  const [isDestinationSelectionOpen, setIsDestinationSelectionOpen] = useState(false);
  const [isRecipientAddressInputOpen, setIsRecipientAddressInputOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  // All withdrawal logic is in the controller
  const controller = useWithdrawController(asset, () => {
    onTransactionSuccess?.();
    setShowTimeline(false);
  });

  // Track shown errors to prevent duplicate toasts
  const shownErrorsRef = useRef(new Set<string>());

  // Handle error toasts (UI side effect with domain-specific messages)
  useEffect(() => {
    if (controller.lastError) {
      const errorKey = `${controller.lastError.type}:${controller.lastError.message}`;
      if (!shownErrorsRef.current.has(errorKey)) {
        shownErrorsRef.current.add(errorKey);

        let errorMessage: string;
        if (controller.lastError.type === "proof") {
          errorMessage = "Proof generation failed";
        } else if (controller.lastError.type === "transaction") {
          errorMessage = getUserMessage(new Error(controller.lastError.message));
        } else {
          errorMessage = getUserMessage(new Error(controller.lastError.message));
        }

        showToast.error(errorMessage, { duration: 5000 });
      }
    }
  }, [controller.lastError]);

  // Handle withdrawal preparation (show timeline)
  const handlePrepareWithdrawal = useCallback(async () => {
    setShowTimeline(true);
    await controller.prepareWithdrawal();
  }, [controller]);

  // Show withdrawal timeline screen
  if (showTimeline && controller.selectedNote) {
    return (
      <WithdrawalTimelineScreen
        onBack={() => setShowTimeline(false)}
        onConfirm={controller.executeWithdrawal}
        note={controller.selectedNote}
        withdrawAmount={controller.amount}
        recipientAddress={controller.recipientAddress}
        destinationChainId={controller.destinationChainId}
        executionFee={controller.executionFee}
        solverFee={controller.solverFee}
        youReceive={controller.youReceive}
        remainingBalance={controller.remainingBalance}
        isProcessing={controller.status === "submitting"}
        isCrossChain={controller.isCrossChain}
        steps={[]} // Timeline steps managed by timeline component
        showPreview={true}
        onShowPreview={() => {}}
      />
    );
  }

  // Show note selection screen
  if (isNoteSelectionOpen) {
    return (
      <NoteSelectionScreen
        availableNotes={controller.availableNotes}
        selectedNote={controller.selectedNote}
        onSelectNote={controller.selectNote}
        onBack={() => setIsNoteSelectionOpen(false)}
        isLoading={controller.isLoadingNotes}
        asset={asset}
      />
    );
  }

  // Show recipient address input screen
  if (isRecipientAddressInputOpen) {
    return (
      <RecipientAddressInputScreen
        value={controller.recipientAddress}
        onChange={controller.setRecipientAddress}
        error={controller.addressError ?? undefined}
        onBack={() => setIsRecipientAddressInputOpen(false)}
        onConfirm={() => setIsRecipientAddressInputOpen(false)}
      />
    );
  }

  // Show destination selection screen
  if (isDestinationSelectionOpen) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
          <BackButton onClick={() => setIsDestinationSelectionOpen(false)} />
          <h2 className="text-lg font-semibold text-white">Select Asset & Chain</h2>
        </div>

        <AssetChainSelectorScreen
          selectedChainId={controller.destinationChainId}
          onChainChange={(newChainId) => {
            controller.setDestinationChain(newChainId);
          }}
          onSelect={() => {
            setIsDestinationSelectionOpen(false);
          }}
        />
      </div>
    );
  }

  // Main Withdrawal Form
  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col overflow-x-hidden lg:max-w-lg">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
          <BackButton onClick={onBack} />
          <h2 className="text-lg font-semibold text-white">Withdraw</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {/* You Pay Section - From Note (Pool Chain) */}
        <InputLabel
          label="You Pay"
          labelRight={
            <Button
              onClick={() => setIsNoteSelectionOpen(true)}
              variant={"ghost"}
              className="flex h-auto items-center gap-1 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              disabled={controller.isPreparing || controller.status === "submitting"}
            >
              {controller.selectedNote ? (
                <>
                  {controller.noteBalance.toFixed(DISPLAY_DECIMALS)} {asset.symbol}
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  Select note
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          }
        />
        {controller.selectedNote ? (
          <TokenAmountInputWithBalance
            amount={controller.amount}
            onAmountChange={controller.setAmount}
            balance={controller.noteBalance.toString()}
            assetSymbol={asset.symbol}
            onMaxClick={controller.setMax}
            disabled={controller.isPreparing || controller.status === "submitting"}
          >
            <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={false} />
          </TokenAmountInputWithBalance>
        ) : (
          <TokenAmountInput
            amount={controller.amount}
            onAmountChange={controller.setAmount}
            disabled={true}
          >
            <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={false} />
          </TokenAmountInput>
        )}

        {/* Error Message */}
        {controller.amountError && (
          <p className="mt-1 text-sm text-red-500">{controller.amountError}</p>
        )}

        {/* Arrow/Divider */}
        <SectionDivider />

        {/* You Receive Section - To Destination Chain */}
        <InputLabel
          label="You Receive"
          labelRight={
            <Button
              onClick={() => setIsRecipientAddressInputOpen(true)}
              variant={"ghost"}
              className="flex h-auto items-center gap-1 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              disabled={
                controller.isPreparing ||
                controller.status === "submitting" ||
                !controller.selectedNote
              }
            >
              {controller.recipientAddress ? (
                <>
                  {controller.recipientAddress.slice(0, 6)}...
                  {controller.recipientAddress.slice(-4)}
                  <ChevronDown className="h-3 w-3" />
                </>
              ) : (
                <>
                  Select recipient
                  <ChevronDown className="h-3 w-3" />
                </>
              )}
            </Button>
          }
        />
        <TokenAmountInput
          amount={
            controller.youReceive > 0
              ? controller.youReceive.toFixed(DISPLAY_DECIMALS)
              : controller.amount || "0"
          }
          onAmountChange={() => {}} // Read-only
          disabled={controller.isPreparing || controller.status === "submitting"}
          readOnly={true}
        >
          <TokenChainSelector
            asset={asset}
            chainId={controller.destinationChainId}
            onClick={() => setIsDestinationSelectionOpen(true)}
            disabled={
              controller.isPreparing ||
              controller.status === "submitting" ||
              !controller.selectedNote
            }
            showChevron={true}
          />
        </TokenAmountInput>

        {/* Fee Breakdown */}
        <WithdrawalFeeBreakdown
          withdrawalAmount={parseFloat(controller.amount) || 0}
          executionFee={controller.executionFee}
          solverFee={controller.solverFee}
          youReceive={controller.youReceive}
          assetSymbol={asset.symbol}
          isCrossChain={controller.isCrossChain}
        />

        {/* Action Button */}
        <div className="mt-2 sm:mt-4">
          <Button
            onClick={handlePrepareWithdrawal}
            disabled={!controller.canWithdraw}
            className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
            size="lg"
          >
            {controller.status === "preparing-proof" || controller.status === "submitting" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {WITHDRAW_STATUS_LABELS[controller.status]}
              </div>
            ) : (
              WITHDRAW_STATUS_LABELS[controller.status]
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
