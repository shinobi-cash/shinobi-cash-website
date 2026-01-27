"use client";

import { Copy, Check, Loader2, CircleQuestionMarkIcon, ArrowDownToLine, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useAppKitNetwork } from "@reown/appkit/react";
import { useSnapshot } from "valtio";
import { Button } from "@workspace/ui/components/button";
import { POOL_CHAIN, SHINOBI_CASH_ETH_POOL, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { CardContainer } from "@/components/shared/CardContainer";
import { AssetPill } from "@/components/shared/AssetPill";
import { AmountInput } from "@/components/shared/AmountInput";
import { QuickAmountButtons } from "@/components/shared/QuickAmountButtons";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { AmountUsd } from "@/components/shared/AmountUsd";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { AssetChainSelectorScreen } from "@/components/screens/AssetChainSelectorScreen";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { modal } from "@/context";
import { useDepositController } from "@/hooks/useDepositController";
import { useTransactionTracking } from "@/hooks/useTransactionTracking";
import { usePriceData } from "@/hooks/usePriceData";
import { DepositController, DepositSelectors } from "@/controllers/DepositController";
import { AuthController } from "@/controllers/AuthController";
import { DepositPreviewScreen } from "@/components/screens/DepositPreviewScreen";
import { COPY_FEEDBACK_DURATION_MS } from "@/constants/timings";
import { DepositTimelineScreen } from "@/components/screens/DepositTimelineScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { ETH_ASSET, DISPLAY_DECIMALS } from "@/constants/withdraw";

type DepositScreen = "timeline" | "preview" | "assetSelector";

function DepositNoteInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleQuestionMarkIcon className="h-4 w-4 cursor-help text-neutral-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Amount after deducting the 1% compliance fee</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function DepositPage() {
  const asset = ETH_ASSET;

  const { switchNetwork } = useAppKitNetwork();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const screens = useScreenNavigation<DepositScreen>();

  const state = useDepositController();
  const { trackTransaction, onTransactionIndexed } = useTransactionTracking();
  const { usdPrice } = usePriceData("ETH");

  useEffect(() => {
    return onTransactionIndexed(() => {
      DepositController.markIndexed();
    });
  }, [onTransactionIndexed]);

  const authState = useSnapshot(AuthController.state);
  const cryptoReady = authState.crypto.cryptoReady;

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

  useEffect(() => {
    if (DepositSelectors.canAutoPrepare()) {
      DepositController.schedulePrepare();
    }
  }, [state.amount, state.wallet.isConnected, cryptoReady, state.wallet.chainId]);

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
    if (state.state.status === "ready") {
      screens.navigate("preview");
    }
  };

  const handleQuickAmount = (percentage: number) => {
    const balance = parseFloat(state.wallet.balance);
    if (balance > 0) {
      const amount = (balance * percentage).toFixed(6);
      DepositController.setAmount(amount);
    }
  };

  // Calculate USD values
  const noteAmount = state.state.status === "ready" ? state.state.amounts.noteAmount : 0;
  const noteAmountUsd = usdPrice && noteAmount > 0 ? noteAmount * usdPrice : null;

  const isDisabled = state.state.status === "submitting" || !DepositSelectors.isOnSupportedChain();
  const formattedBalance = parseFloat(state.wallet.balance).toFixed(DISPLAY_DECIMALS);

  // Deposit Timeline Screen
  if (screens.is("timeline")) {
    const noteAmountValue = state.lastPreparedAmounts?.noteAmount ?? 0;

    const timelineStatus = (() => {
      const s = state.state.status;
      if (s === "submitting") return "submitting" as const;
      if (s === "confirming") return "confirming" as const;
      if (s === "confirmed-onchain") return "confirmed-onchain" as const;
      if (s === "indexed") return "indexed" as const;
      if (s === "failed") return "failed" as const;
      if (s === "error") return "error" as const;
      return "submitting" as const;
    })();

    const error = state.state.status === "error" ? state.state.error : null;
    const failedReason = state.state.status === "failed" ? state.state.reason : null;
    const isCrossChain = state.wallet.chainId !== POOL_CHAIN.id;

    return (
      <DepositTimelineScreen
        noteAmount={noteAmountValue}
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

  // Deposit Preview Screen
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
      <ScreenLayout
        containerClassName="h-[600px]"
        header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}
      >
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
    <ScreenLayout
      containerClassName="h-[600px]"
      header={<ScreenHeader title="Deposit" icon={<ArrowDownToLine className="h-5 w-5" />} />}
      contentClassName="px-4 py-4 sm:px-6"
      footer={
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
      }
    >
      <div className="flex-1 space-y-3 overflow-y-auto">
        <div className="relative flex flex-col gap-2">
          {/* You Pay */}
          <CardContainer>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-neutral-400">You Pay</span>
              <div className="flex items-center gap-2">
                {state.wallet.address ? (
                  <>
                    <span className="text-sm text-neutral-400">
                      {formattedBalance} {asset.symbol}
                    </span>
                    <button
                      onClick={handleCopyAddress}
                      className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                    >
                      <Wallet className="h-3 w-3" />
                      {state.wallet.address.slice(0, 6)}...{state.wallet.address.slice(-4)}
                      {copiedAddress ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleConnectWallet}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-sm text-neutral-400 transition-colors hover:bg-white/[0.08] hover:text-white"
                  >
                    <Wallet className="h-3 w-3" />
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <AssetPill
                asset={asset}
                chainId={state.wallet.chainId}
                onClick={() => screens.navigate("assetSelector")}
                disabled={isDisabled}
              />
              <AmountInput
                value={state.amount}
                onChange={(value) => DepositController.setAmount(value)}
                disabled={isDisabled}
              />
            </div>
            <div className="flex items-center justify-end">
              <QuickAmountButtons
                onSelect={handleQuickAmount}
                disabled={isDisabled || parseFloat(state.wallet.balance) <= 0}
              />
            </div>
          </CardContainer>

          <SectionDivider />

          {/* You Receive */}
          <CardContainer>
            <div className="flex items-center justify-between py-1">
              <span className="text-sm text-neutral-400">You Receive (Deposit Note)</span>
              <DepositNoteInfo />
            </div>

            <div className="flex items-center justify-between gap-3">
              <AssetPill asset={asset} chainId={POOL_CHAIN.id} disabled />
              <AmountInput value={noteAmount > 0 ? noteAmount.toFixed(DISPLAY_DECIMALS) : "0"} disabled />
            </div>

            <div className="flex items-center justify-between py-1">
              <PriceDisplay symbol={asset.symbol} priceUsd={usdPrice} />
              <AmountUsd amountUsd={noteAmountUsd} />
            </div>
          </CardContainer>
        </div>

        <FeeBreakdown
          executionFee={state.state.status === "ready" ? state.state.gasEstimate.gasCostEth : "0"}
          assetSymbol={asset.symbol}
          solverFee={state.state.status === "ready" ? state.state.amounts.solverFee : 0}
          isCrossChain={DepositSelectors.isCrossChain()}
          isEstimating={state.state.status === "preparing" && state.state.step === "gas"}
          decimals={6}
        />
      </div>
    </ScreenLayout>
  );
}
