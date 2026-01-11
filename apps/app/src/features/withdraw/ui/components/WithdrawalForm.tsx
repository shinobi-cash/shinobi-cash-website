/**
 * Withdrawal Form - Refactored
 * Pure UI component that delegates all logic to useWithdrawController
 */

import { Loader2, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenAmountInputWithBalance } from "@/components/shared/TokenAmountInputWithBalance";
import { InputLabel } from "@/components/shared/InputLabel";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { NoteSelectionScreen } from "../screens/NoteSelectionScreen";
import { WithdrawalTimelineScreen } from "../screens/WithdrawalTimelineScreen";
import { showToast } from "@/lib/toast";
import { getUserMessage } from "@/lib/errors/errorHandler";
import { RecipientAddressInputScreen } from "../screens/RecipientAddressInputScreen";
import { DISPLAY_DECIMALS, ETH_ASSET } from "../../constants";
import { WITHDRAW_STATUS_LABELS } from "../../types/withdrawStatus";
import { useWithdrawController } from "../../controller/useWithdrawController";
import { ScreenLayout } from "@/components/layouts/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";

type WithdrawScreen = "noteSelection" | "recipientInput" | "destinationSelection" | "timeline";

interface WithdrawalFormProps {
  onTransactionSuccess?: () => void;
}

export function WithdrawalForm({ onTransactionSuccess }: WithdrawalFormProps) {
  const asset = ETH_ASSET;

  const screens = useScreenNavigation<WithdrawScreen>();

  // All withdrawal logic is in the controller
  const controller = useWithdrawController(asset, () => {
    onTransactionSuccess?.();
    screens.close();
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
    screens.navigate("timeline");
    await controller.prepareWithdrawal();
  }, [controller, screens]);

  // Show withdrawal timeline screen
  if (screens.is("timeline") && controller.selectedNote) {
    return (
      <WithdrawalTimelineScreen
        onBack={screens.close}
        onConfirm={controller.executeWithdrawal}
        note={controller.selectedNote}
        withdrawAmount={controller.amount}
        recipientAddress={controller.recipientAddress}
        destinationChainId={controller.destinationChainId}
        executionFee={controller.executionFee}
        solverFee={controller.solverFee}
        youReceive={controller.youReceive}
        remainingBalance={controller.remainingBalance}
        isProcessing={controller.status === "preparing-proof" || controller.status === "submitting"}
        isCrossChain={controller.isCrossChain}
        steps={[]} // Timeline steps managed by timeline component
        showPreview={true}
        onShowPreview={() => {}}
      />
    );
  }

  // Show note selection screen
  if (screens.is("noteSelection")) {
    return (
      <NoteSelectionScreen
        availableNotes={controller.availableNotes}
        selectedNote={controller.selectedNote}
        onSelectNote={controller.selectNote}
        onBack={screens.close}
        isLoading={controller.isLoadingNotes}
        asset={asset}
      />
    );
  }

  // Show recipient address input screen
  if (screens.is("recipientInput")) {
    return (
      <RecipientAddressInputScreen
        value={controller.recipientAddress}
        onChange={controller.setRecipientAddress}
        error={controller.addressError ?? undefined}
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
          selectedChainId={controller.destinationChainId}
          onChainChange={(newChainId) => {
            controller.setDestinationChain(newChainId);
          }}
          onSelect={screens.close}
        />
      </ScreenLayout>
    );
  }

  // Main Withdrawal Form
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
        <TokenAmountInputWithBalance
          amount={controller.amount}
          onAmountChange={controller.setAmount}
          balance={controller.selectedNote ? controller.noteBalance.toString() : "0"}
          assetSymbol={asset.symbol}
          onMaxClick={controller.setMax}
          disabled={
            !controller.selectedNote || controller.isPreparing || controller.status === "submitting"
          }
        >
          <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={true} />
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
          onAmountChange={() => {}}
          disabled={true}
        >
          <TokenChainSelector
            asset={asset}
            chainId={controller.destinationChainId}
            onClick={() => screens.navigate("destinationSelection")}
            disabled={
              controller.isPreparing ||
              controller.status === "submitting" ||
              !controller.selectedNote
            }
            showChevron={true}
          />
        </TokenAmountInput>

        {/* Fee Breakdown */}
        <FeeBreakdown
          executionFee={controller.executionFee}
          solverFee={controller.solverFee}
          assetSymbol={asset.symbol}
          isCrossChain={controller.isCrossChain}
          showAsDeduction={true}
        />

        {/* Action Button */}
        <div className="sm:mt-4">
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
