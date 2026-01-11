/**
 * Deposit Form - Refactored
 * Pure UI component that delegates all logic to useDepositController
 */

import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN, SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenAmountInputWithBalance } from "@/components/shared/TokenAmountInputWithBalance";
import { InputLabel } from "@/components/shared/InputLabel";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { CircleQuestionMarkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { modal } from "@/context";
import { showToast } from "@/lib/toast";
import { getUserMessage } from "@/lib/errors/errorHandler";
import { useDepositController } from "../../controller/useDepositController";
import { DEPOSIT_STATUS_LABELS } from "../../types/depositStatus";
import { DepositPreviewScreen } from "../screens/DepositPreviewScreen";
import { DepositTimelineScreen } from "../screens/DepositTimelineScreen";
import { ScreenLayout } from "@/components/layouts/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";

type DepositScreen = "timeline" | "preview" | "assetSelector";

function DepositNoteInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleQuestionMarkIcon className="h-5 w-5" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Amount after deducting the 1% compliance fee</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface DepositFormProps {
  asset: { symbol: string; name: string; icon: string };
}

export function DepositForm({ asset }: DepositFormProps) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const screens = useScreenNavigation<DepositScreen>();

  // All deposit logic is in the controller
  const controller = useDepositController();

  // Track shown errors to prevent duplicate toasts
  const shownErrorsRef = useRef(new Set<string>());

  // Handle error toasts (UI side effect with domain-specific messages)
  useEffect(() => {
    if (controller.lastError) {
      const errorKey = `${controller.lastError.type}:${controller.lastError.message}`;
      if (!shownErrorsRef.current.has(errorKey)) {
        shownErrorsRef.current.add(errorKey);

        let errorMessage: string;
        if (controller.lastError.type === "gas") {
          errorMessage = getUserMessage(new Error(controller.lastError.message));
        } else if (controller.lastError.type === "commitment") {
          errorMessage = "Note generation failed";
        } else {
          errorMessage = getUserMessage(new Error(controller.lastError.message));
        }

        showToast.error(errorMessage, { duration: 5000 });
      }
    }
  }, [controller.lastError]);

  // Clear shown errors when status resets (UX hygiene)
  useEffect(() => {
    if (controller.status === "idle") {
      shownErrorsRef.current.clear();
    }
  }, [controller.status]);

  // Copy address handler
  const handleCopyAddress = async () => {
    if (!controller.address) return;
    try {
      await navigator.clipboard.writeText(controller.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.warn("Copy failed:", error);
    }
  };

  const handleConnectWallet = () => {
    modal.open();
  };

  const handleConfirmDeposit = () => {
    controller.deposit();
    screens.navigate("timeline");
  };

  // Deposit Timeline Screen
  if (screens.is("timeline")) {
    return (
      <DepositTimelineScreen
        noteAmount={controller.depositNoteAmount}
        isWalletSubmitting={controller.isDepositing}
        walletError={controller.transactionError}
        onClose={() => {
          controller.reset();
          screens.close();
        }}
      />
    );
  }

  // Show deposit preview screen
  if (screens.is("preview") && controller.address) {
    return (
      <DepositPreviewScreen
        onBack={screens.close}
        onConfirm={handleConfirmDeposit}
        depositAmount={controller.amount}
        complianceFee={controller.complianceFee}
        gasCostEth={controller.gasCostEth}
        solverFee={controller.solverFee}
        originChainId={chainId}
        destinationChainId={POOL_CHAIN.id}
        poolAddress={SHINOBI_CASH_ETH_POOL.address}
        userAddress={controller.address}
        isProcessing={controller.isDepositing}
      />
    );
  }

  // Asset/Chain Selector Screen
  if (screens.is("assetSelector")) {
    return (
      <ScreenLayout header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}>
        <AssetChainSelectorScreen
          selectedChainId={chainId}
          onChainChange={(newChainId) => {
            switchChain?.({ chainId: newChainId });
          }}
          onSelect={screens.close}
        />
      </ScreenLayout>
    );
  }

  // Main Deposit Form
  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex-1 space-y-2 overflow-y-auto">
        {/* You Pay Section */}
        <InputLabel
          label="You Pay"
          labelRight={
            controller.address ? (
              <Button
                onClick={handleCopyAddress}
                variant="ghost"
                className="flex h-auto items-center gap-1.5 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              >
                {controller.address.slice(0, 6)}...{controller.address.slice(-4)}
                {copiedAddress ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleConnectWallet}
                className="h-auto p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              >
                Connect Wallet
              </Button>
            )
          }
        />
        <TokenAmountInputWithBalance
          amount={controller.amount}
          onAmountChange={controller.setAmount}
          balance={controller.balance}
          assetSymbol={asset.symbol}
          onMaxClick={() => controller.setAmount(controller.balance)}
          disabled={controller.isDepositing || !controller.isOnSupportedChain}
        >
          <TokenChainSelector
            asset={asset}
            chainId={chainId}
            onClick={() => screens.navigate("assetSelector")}
            disabled={controller.isDepositing || !controller.isOnSupportedChain}
            showChevron={true}
          />
        </TokenAmountInputWithBalance>

        {/* Arrow Divider */}
        <SectionDivider />

        {/* You Receive Section */}
        <InputLabel label="You Receive (Deposit Note)" labelRight={<DepositNoteInfo />} />
        <TokenAmountInput
          amount={controller.depositNoteAmount > 0 ? controller.depositNoteAmount.toFixed(4) : "0"}
          onAmountChange={() => {}}
          disabled={true}
        >
          <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={true} disabled />
        </TokenAmountInput>

        {/* Fee Breakdown */}
        <FeeBreakdown
          executionFee={controller.gasCostEth}
          assetSymbol={asset.symbol}
          solverFee={controller.solverFee}
          isCrossChain={controller.isCrossChain}
          isEstimating={controller.isEstimatingGas}
          decimals={6}
        />

        {/* Submit Button */}
        <div className="mt-2 sm:mt-4">
          <Button
            disabled={!controller.canDeposit}
            onClick={() => screens.navigate("preview")}
            className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
            size="lg"
          >
            {controller.status === "submitting" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {DEPOSIT_STATUS_LABELS[controller.status]}
              </div>
            ) : (
              "Review Deposit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
