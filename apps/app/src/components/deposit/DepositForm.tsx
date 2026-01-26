/**
 * Deposit Form - Refactored
 * Pure UI component that delegates all logic to useDepositController
 */

import { Copy, Check, Loader2, CircleQuestionMarkIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useSnapshot } from "valtio";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN, SHINOBI_CASH_ETH_POOL, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { TokenAmountInputWithBalance } from "@/components/shared/TokenAmountInputWithBalance";
import { InputLabel } from "@/components/shared/InputLabel";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { AssetChainSelector } from "@/components/shared/AssetChainSelector";
import { AssetChainSelectorScreen } from "@/components/screens/AssetChainSelectorScreen";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { modal } from "@/context";
import { useDepositController } from "@/hooks/useDepositController";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { DepositController, DepositSelectors } from "@/controllers/DepositController";
import { AuthController } from "@/controllers/AuthController";
import { DepositPreviewScreen } from "@/components/screens/DepositPreviewScreen";
import { COPY_FEEDBACK_DURATION_MS } from "@/constants/timings";
import { DepositTimelineScreen } from "@/components/screens/DepositTimelineScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
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
  const { switchNetwork } = useAppKitNetwork();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const screens = useScreenNavigation<DepositScreen>();

  // Read-only snapshot from controller
  const state = useDepositController();

  // Transaction tracking for indexing status
  const { trackTransaction, onTransactionIndexed } = useTransactionTracking();

  // Listen for indexed event to update controller
  useEffect(() => {
    return onTransactionIndexed(() => {
      DepositController.markIndexed();
    });
  }, [onTransactionIndexed]);

  // Subscribe to AuthController for crypto state
  const authState = useSnapshot(AuthController.state);
  const cryptoReady = authState.crypto.cryptoReady;

  // Copy address handler
  const handleCopyAddress = async () => {
    if (!state.wallet.address) return;
    try {
      await navigator.clipboard.writeText(state.wallet.address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), COPY_FEEDBACK_DURATION_MS);
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
  }, [state.amount, state.wallet.isConnected, cryptoReady, state.wallet.chainId]);

  // Track transaction for indexing status when txHash becomes available
  const txHash =
    state.state.status === "confirming" ||
    state.state.status === "confirmed-onchain" ||
    state.state.status === "indexed" ||
    state.state.status === "failed"
      ? state.state.txHash
      : null;

  useEffect(() => {
    if (txHash) {
      trackTransaction(txHash, state.wallet.chainId);
    }
  }, [txHash, state.wallet.chainId, trackTransaction]);

  const handleReviewDeposit = () => {
    // Already prepared, just navigate
    if (state.state.status === "ready") {
      screens.navigate("preview");
    }
  };

  // Deposit Timeline Screen
  if (screens.is("timeline")) {
    // Use preserved amounts from controller (survives state transitions)
    const noteAmount = state.lastPreparedAmounts?.noteAmount ?? 0;

    // Map controller state to timeline props
    const timelineStatus = (() => {
      const s = state.state.status;
      if (s === "submitting") return "submitting" as const;
      if (s === "confirming") return "confirming" as const;
      if (s === "confirmed-onchain") return "confirmed-onchain" as const;
      if (s === "indexed") return "indexed" as const;
      if (s === "failed") return "failed" as const;
      if (s === "error") return "error" as const;
      return "submitting" as const; // Default for other states
    })();

    const error = state.state.status === "error" ? state.state.error : null;
    const failedReason = state.state.status === "failed" ? state.state.reason : null;
    const isCrossChain = state.wallet.chainId !== POOL_CHAIN.id;

    return (
      <DepositTimelineScreen
        noteAmount={noteAmount}
        status={timelineStatus}
        txHash={txHash}
        error={error}
        failedReason={failedReason}
        originChainId={state.wallet.chainId}
        isCrossChain={isCrossChain}
        onClose={() => {
          DepositController.reset();
          screens.close();
        }}
      />
    );
  }

  // Show deposit preview screen
  if (screens.is("preview") && state.wallet.address) {
    const depositAmounts =
      state.state.status === "ready"
        ? state.state.amounts
        : { noteAmount: 0, complianceFee: 0, solverFee: 0 };
    const gasEstimate =
      state.state.status === "ready" ? state.state.gasEstimate : { gasCostEth: "0" };
    const isSubmitting = state.state.status === "submitting";

    const isCrossChain = state.wallet.chainId !== POOL_CHAIN.id;

    return (
      <DepositPreviewScreen
        onBack={screens.close}
        onConfirm={handleConfirmDeposit}
        depositAmount={state.amount}
        complianceFee={depositAmounts.complianceFee}
        gasCostEth={gasEstimate.gasCostEth}
        solverFee={depositAmounts.solverFee}
        originChainId={state.wallet.chainId}
        destinationChainId={POOL_CHAIN.id}
        poolAddress={SHINOBI_CASH_ETH_POOL.address}
        userAddress={state.wallet.address}
        isProcessing={isSubmitting}
        isCrossChain={isCrossChain}
      />
    );
  }

  // Asset/Chain Selector Screen
  if (screens.is("assetSelector")) {
    return (
      <ScreenLayout containerClassName="h-[600px]" header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}>
        <AssetChainSelectorScreen
          selectedChainId={state.wallet.chainId}
          onChainChange={(newChainId) => {
            const network = SHINOBI_CASH_SUPPORTED_CHAINS.find((c) => c.id === newChainId);
            if (network) {
              switchNetwork(network);
            }
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
                className="flex h-auto items-center gap-1.5 p-0 text-sm text-neutral-400 transition-colors hover:text-white"
              >
                {state.wallet.address.slice(0, 6)}...{state.wallet.address.slice(-4)}
                {copiedAddress ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleConnectWallet}
                className="h-auto p-0 text-sm text-neutral-400 transition-colors hover:text-white"
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
          <AssetChainSelector
            asset={asset}
            chainId={state.wallet.chainId}
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
          <AssetChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={true} disabled />
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
