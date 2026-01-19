/**
 * Withdrawal Form - New Controller Pattern
 * Pure UI component using WithdrawController via snapshot adapter
 * Follows interaction contract: Review = instant, Confirm = work starts
 */

import { Loader2, ChevronDown } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenAmountInputWithBalance } from "@/components/shared/TokenAmountInputWithBalance";
import { InputLabel } from "@/components/shared/InputLabel";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { AssetChainSelector } from "@/components/shared/AssetChainSelector";
import { AssetChainSelectorScreen } from "@/components/screens/AssetChainSelectorScreen";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { NoteSelectionScreen } from "@/components/screens/NoteSelectionScreen";
import { WithdrawalTimelineScreen } from "@/components/screens/WithdrawalTimelineScreen";
import { showToast } from "@/lib/toast";
import { useErrorDisplay } from "@/hooks/useErrorDisplay";
import { RecipientAddressInputScreen } from "@/components/screens/RecipientAddressInputScreen";
import { DISPLAY_DECIMALS, ETH_ASSET } from "@/constants/withdraw";
import { formatEthAmount } from "@/utils/formatters";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { useWithdrawController } from "@/hooks/useWithdrawController";
import { WithdrawController, WithdrawSelectors } from "@/controllers/WithdrawController";

type WithdrawScreen = "noteSelection" | "recipientInput" | "destinationSelection" | "timeline";

interface WithdrawalFormProps {
  onTransactionSuccess?: () => void;
}

export function WithdrawalForm({ onTransactionSuccess }: WithdrawalFormProps) {
  const asset = ETH_ASSET;

  const screens = useScreenNavigation<WithdrawScreen>();

  // Read-only snapshot from controller (React adapter)
  const state = useWithdrawController();

  // Centralized error display
  useErrorDisplay(state.lastError, state.state.status === "idle");

  // Auto-preview: Schedule lightweight fee preview when inputs change (debounced 500ms)
  useEffect(() => {
    if (WithdrawSelectors.canAutoPreview()) {
      WithdrawController.schedulePreview();
    }
  }, [state.amount, state.recipientAddress, state.selectedNote, state.destinationChainId]);

  // Notify parent on successful transaction (but don't auto-close - let user see success message)
  useEffect(() => {
    if (state.state.status === "confirmed") {
      onTransactionSuccess?.();
    }
  }, [state.state.status, onTransactionSuccess]);

  // Interaction Contract Fix: Review = instant validation + navigation (NO work)
  const handleReviewWithdrawal = () => {
    if (!WithdrawSelectors.canWithdraw()) {
      showToast.error("Please fill all required fields");
      return;
    }
    // Just navigate to preview/timeline screen (instant, uses preview fee quote)
    screens.navigate("timeline");
  };

  // Show withdrawal timeline screen
  // Interaction Contract: Confirm button in timeline calls WithdrawController.confirm()
  if (screens.is("timeline")) {
    return (
      <WithdrawalTimelineScreen
        onBack={screens.close}
        onConfirm={() => {
          // Confirm = prepare + submit (all work happens here)
          WithdrawController.confirm();
        }}
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

  // Show recipient address input screen
  if (screens.is("recipientInput")) {
    return (
      <RecipientAddressInputScreen
        value={state.recipientAddress}
        onChange={(address) => WithdrawController.setRecipientAddress(address)}
        error={WithdrawSelectors.getAddressError() ?? undefined}
        onBack={screens.close}
        onConfirm={screens.close}
      />
    );
  }

  // Show destination selection screen
  if (screens.is("destinationSelection")) {
    return (
      <ScreenLayout header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}>
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
  // Convert note amount from wei string to ETH number
  const noteBalance = state.selectedNote
    ? parseFloat(formatEthAmount(state.selectedNote.amount))
    : 0;

  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {/* You Pay Section - From Note (Pool Chain) */}
        <InputLabel
          label="You Pay"
          labelRight={
            <Button
              onClick={() => screens.navigate("noteSelection")}
              variant={"ghost"}
              className="flex h-auto items-center gap-1 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              disabled={isProcessing}
            >
              {state.selectedNote ? (
                <>
                  {noteBalance.toFixed(DISPLAY_DECIMALS)} {asset.symbol}
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
        <TokenAmountInputWithBalance
          amount={state.amount}
          onAmountChange={(amount) => WithdrawController.setAmount(amount)}
          balance={state.selectedNote ? noteBalance.toString() : "0"}
          assetSymbol={asset.symbol}
          onMaxClick={() => WithdrawController.setMax()}
          disabled={!state.selectedNote || isProcessing}
        >
          <AssetChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={true} />
        </TokenAmountInputWithBalance>

        {/* Arrow/Divider */}
        <SectionDivider />

        {/* You Receive Section - To Destination Chain */}
        <InputLabel
          label="You Receive"
          labelRight={
            <Button
              onClick={() => screens.navigate("recipientInput")}
              variant={"ghost"}
              className="flex h-auto items-center gap-1 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              disabled={isProcessing || !state.selectedNote}
            >
              {state.recipientAddress ? (
                <>
                  {state.recipientAddress.slice(0, 6)}...
                  {state.recipientAddress.slice(-4)}
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
            WithdrawSelectors.getYouReceive() > 0
              ? WithdrawSelectors.getYouReceive().toFixed(DISPLAY_DECIMALS)
              : state.amount || "0"
          }
          onAmountChange={() => {}}
          disabled={true}
        >
          <AssetChainSelector
            asset={asset}
            chainId={state.destinationChainId}
            onClick={() => screens.navigate("destinationSelection")}
            disabled={isProcessing || !state.selectedNote}
            showChevron={true}
          />
        </TokenAmountInput>

        {/* Fee Breakdown */}
        <FeeBreakdown
          executionFee={WithdrawSelectors.getExecutionFee()}
          solverFee={WithdrawSelectors.getSolverFee()}
          assetSymbol={asset.symbol}
          isCrossChain={WithdrawSelectors.isCrossChain()}
          showAsDeduction={true}
        />

        {/* Action Button */}
        <div className="sm:mt-4">
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
            ) : (
              "Review Withdrawal"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
