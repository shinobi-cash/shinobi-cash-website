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
import { useDepositControllerSnapshot } from "../../hooks/useDepositControllerSnapshot";
import { DepositController, DepositSelectors } from "../../controllers/DepositController";
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

  // Read-only snapshot from controller
  const state = useDepositControllerSnapshot();

  // Track shown errors to prevent duplicate toasts
  const shownErrorsRef = useRef(new Set<string>());

  // Handle error toasts (UI side effect with domain-specific messages)
  useEffect(() => {
    if (state.state.status === "error") {
      const error = state.state.error;
      const errorKey = `${error.type}:${error.message}`;

      if (!shownErrorsRef.current.has(errorKey)) {
        shownErrorsRef.current.add(errorKey);

        let errorMessage: string;
        if (error.type === "precondition") {
          errorMessage = error.message; // Preconditions are user-facing messages
        } else if (error.type === "gas") {
          errorMessage = getUserMessage(new Error(error.message));
        } else if (error.type === "commitment") {
          errorMessage = "Note generation failed";
        } else {
          errorMessage = getUserMessage(new Error(error.message));
        }

        showToast.error(errorMessage, { duration: 5000 });
      }
    }
  }, [state.state]);

  // Clear shown errors when status resets (UX hygiene)
  useEffect(() => {
    if (state.state.status === "idle") {
      shownErrorsRef.current.clear();
    }
  }, [state.state.status]);

  // Copy address handler
  const handleCopyAddress = async () => {
    if (!state.wallet.address) return;
    try {
      await navigator.clipboard.writeText(state.wallet.address);
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
    DepositController.submit();
    screens.navigate("timeline");
  };

  // Auto-prepare when prerequisites are met
  // Policy lives in controller, UI just expresses intent
  useEffect(() => {
    if (DepositSelectors.canAutoPrepare()) {
      DepositController.schedulePrepare();
    }
  }, [
    state.amount,
    state.wallet.isConnected,
    state.crypto.cryptoReady,
    state.wallet.chainId,
  ]);

  const handleReviewDeposit = () => {
    // Already prepared, just navigate
    if (state.state.status === "ready") {
      screens.navigate("preview");
    }
  };

  // Deposit Timeline Screen
  if (screens.is("timeline")) {
    const depositAmounts = state.state.status === "ready" ? state.state.amounts : { noteAmount: 0 };
    const isSubmitting = state.state.status === "submitting";
    const txError = state.state.status === "error" ? state.state.error.message : null;

    return (
      <DepositTimelineScreen
        noteAmount={depositAmounts.noteAmount}
        isWalletSubmitting={isSubmitting}
        walletError={txError}
        onClose={() => {
          DepositController.reset();
          screens.close();
        }}
      />
    );
  }

  // Show deposit preview screen
  if (screens.is("preview") && state.wallet.address) {
    const depositAmounts = state.state.status === "ready" ? state.state.amounts : { noteAmount: 0, complianceFee: 0, solverFee: 0 };
    const gasEstimate = state.state.status === "ready" ? state.state.gasEstimate : { gasCostEth: "0" };
    const isSubmitting = state.state.status === "submitting";

    return (
      <DepositPreviewScreen
        onBack={screens.close}
        onConfirm={handleConfirmDeposit}
        depositAmount={state.amount}
        complianceFee={depositAmounts.complianceFee}
        gasCostEth={gasEstimate.gasCostEth}
        solverFee={depositAmounts.solverFee}
        originChainId={chainId}
        destinationChainId={POOL_CHAIN.id}
        poolAddress={SHINOBI_CASH_ETH_POOL.address}
        userAddress={state.wallet.address}
        isProcessing={isSubmitting}
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
            state.wallet.address ? (
              <Button
                onClick={handleCopyAddress}
                variant="ghost"
                className="flex h-auto items-center gap-1.5 p-0 text-sm text-purple-400 transition-colors hover:text-purple-300"
              >
                {state.wallet.address.slice(0, 6)}...{state.wallet.address.slice(-4)}
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
          amount={state.amount}
          onAmountChange={(value) => DepositController.setAmount(value)}
          balance={state.wallet.balance}
          assetSymbol={asset.symbol}
          onMaxClick={() => DepositController.setAmount(state.wallet.balance)}
          disabled={state.state.status === "submitting" || !DepositSelectors.isOnSupportedChain()}
        >
          <TokenChainSelector
            asset={asset}
            chainId={chainId}
            onClick={() => screens.navigate("assetSelector")}
            disabled={state.state.status === "submitting" || !DepositSelectors.isOnSupportedChain()}
            showChevron={true}
          />
        </TokenAmountInputWithBalance>

        {/* Arrow Divider */}
        <SectionDivider />

        {/* You Receive Section */}
        <InputLabel label="You Receive (Deposit Note)" labelRight={<DepositNoteInfo />} />
        <TokenAmountInput
          amount={state.state.status === "ready" ? state.state.amounts.noteAmount.toFixed(4) : "0"}
          onAmountChange={() => {}}
          disabled={true}
        >
          <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={true} disabled />
        </TokenAmountInput>

        {/* Fee Breakdown */}
        <FeeBreakdown
          executionFee={state.state.status === "ready" ? state.state.gasEstimate.gasCostEth : "0"}
          assetSymbol={asset.symbol}
          solverFee={state.state.status === "ready" ? state.state.amounts.solverFee : 0}
          isCrossChain={DepositSelectors.isCrossChain()}
          isEstimating={state.state.status === "preparing" && state.state.step === "gas"}
          decimals={6}
        />

        {/* Submit Button */}
        <div className="mt-2 sm:mt-4">
          <Button
            disabled={!DepositSelectors.canDeposit()}
            onClick={handleReviewDeposit}
            className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
            size="lg"
          >
            {state.state.status === "preparing" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparing Deposit...
              </div>
            ) : state.state.status === "ready" ? (
              "Review Deposit"
            ) : !state.amount.trim() ? (
              "Enter Amount to Deposit"
            ) : !state.wallet.isConnected ? (
              "Connect Wallet to Continue"
            ) : !DepositSelectors.isOnSupportedChain() ? (
              "Switch to Supported Network"
            ) : (
              "Review Deposit"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
