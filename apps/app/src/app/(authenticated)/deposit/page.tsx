"use client";

import { Copy, Check, CircleQuestionMarkIcon, ArrowDownToLine, Wallet } from "lucide-react";
import { useState, useEffect } from "react";
import { useSwitchChain } from "wagmi";
import { useSnapshot } from "valtio";
import { Button } from "@workspace/ui/components/button";
import {
  POOL_CHAIN,
  SHINOBI_CASH_ETH_POOL,
  MIN_AMOUNT_CONFIG,
  FEE_CONFIG,
} from "@shinobi-cash/constants";
import { formatEther } from "viem";
import { CardContainer } from "@/components/shared/CardContainer";
import { AssetPill } from "@/components/shared/AssetPill";
import { AmountInput } from "@/components/shared/AmountInput";
import { QuickAmountButtons } from "@/components/shared/QuickAmountButtons";
import { PriceDisplay } from "@/components/shared/PriceDisplay";
import { AmountUsd } from "@/components/shared/AmountUsd";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { AssetChainSelectorScreen } from "@/components/screens/AssetChainSelectorScreen";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { openWalletModal } from "@/context/wallet";
import { useDepositController } from "@/hooks/useDepositController";
import { usePriceData } from "@/hooks/usePriceData";
import { DepositController, DepositSelectors } from "@/controllers/DepositController";
import { AuthController } from "@/controllers/AuthController";
import { DepositPreviewScreen } from "@/components/screens/DepositPreviewScreen";
import { COPY_FEEDBACK_DURATION_MS } from "@/constants/timings";
import { DepositTimelineScreen } from "@/components/screens/DepositTimelineScreen";
import { ScreenLayout } from "@/components/layout/ScreenLayout";
import { ScreenHeader } from "@/components/shared/ScreenHeader";
import { useScreenNavigation } from "@/hooks/useScreenNavigation";
import { ETH_ASSET } from "@/constants/withdraw";
import { formatUsdAmount, formatDisplayAmount } from "@/utils/formatters";
import { DepositSettings } from "@/components/shared/DepositSettings";

type DepositScreen = "timeline" | "preview" | "assetSelector";

function DepositNoteInfo() {
  const vettingFeePercent = FEE_CONFIG.VETTING_FEE_BPS / 100;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleQuestionMarkIcon className="h-4 w-4 cursor-help text-neutral-400" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Amount after deducting the {vettingFeePercent}% compliance fee</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function DepositPage() {
  const asset = ETH_ASSET;

  const { switchChain } = useSwitchChain();
  const [copiedAddress, setCopiedAddress] = useState(false);

  const screens = useScreenNavigation<DepositScreen>();

  const state = useDepositController();
  const { usdPrice } = usePriceData("ETH");

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
    openWalletModal();
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
    state.state.status === "confirmed" ||
    state.state.status === "failed"
      ? state.state.txHash
      : null;

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
  const depositAmountUsd =
    usdPrice && parseFloat(state.amount) > 0 ? parseFloat(state.amount) * usdPrice : null;

  const isDisabled = state.state.status === "submitting" || !DepositSelectors.isOnSupportedChain();
  const formattedBalance = formatDisplayAmount(state.wallet.balance);

  // Minimum amount validation
  const isCrossChain = DepositSelectors.isCrossChain();
  const minAmount = isCrossChain
    ? MIN_AMOUNT_CONFIG.MIN_CROSSCHAIN_DEPOSIT
    : MIN_AMOUNT_CONFIG.MIN_POOL_DEPOSIT;
  const minAmountEth = parseFloat(formatEther(minAmount));
  const depositAmountNum = parseFloat(state.amount) || 0;
  const isBelowMinimum =
    state.amount.trim() !== "" && depositAmountNum > 0 && !DepositSelectors.isAboveMinimum();

  // Deposit Timeline Screen
  if (screens.is("timeline")) {
    const noteAmountValue = state.lastPreparedAmounts?.noteAmount ?? 0;

    const timelineStatus = (() => {
      const s = state.state.status;
      if (s === "submitting") return "submitting" as const;
      if (s === "confirming") return "confirming" as const;
      if (s === "confirmed") return "confirmed" as const;
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
        containerClassName="flex-1 sm:flex-none sm:h-[600px]"
        header={<ScreenHeader title="Select Asset & Chain" onBack={screens.close} />}
      >
        <AssetChainSelectorScreen
          selectedChainId={state.wallet.chainId}
          onChainChange={(newChainId) => {
            switchChain({ chainId: newChainId });
          }}
          onSelect={screens.close}
        />
      </ScreenLayout>
    );
  }

  // Main Deposit Form
  return (
    <ScreenLayout
      header={
        <ScreenHeader
          title="Deposit"
          icon={<ArrowDownToLine className="h-5 w-5" />}
          rightContent={<DepositSettings />}
        />
      }
      contentClassName="px-4 py-4"
      footer={
        <Button
          disabled={!DepositSelectors.canDeposit() || isBelowMinimum}
          onClick={handleReviewDeposit}
          className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
          size="lg"
        >
          {state.state.status === "preparing"
            ? "Estimating gas..."
            : state.state.status === "ready" && !isBelowMinimum
              ? "Review Deposit"
              : !state.amount.trim()
                ? "Enter Amount to Deposit"
                : isBelowMinimum
                  ? `Minimum ${minAmountEth} ETH`
                  : !state.wallet.isConnected
                    ? "Connect Wallet to Continue"
                    : !DepositSelectors.isOnSupportedChain()
                      ? "Switch to Supported Network"
                      : "Review Deposit"}
        </Button>
      }
    >
      <div className="flex flex-col gap-2">
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
              error={isBelowMinimum}
            />
          </div>
          <div className="flex items-center">
            <AmountUsd amountUsd={depositAmountUsd} />
            <div className="ml-auto">
              <QuickAmountButtons
                onSelect={handleQuickAmount}
                disabled={isDisabled || parseFloat(state.wallet.balance) <= 0}
              />
            </div>
          </div>
        </CardContainer>

        <SectionDivider
          networkFee={
            state.state.status === "ready" && usdPrice
              ? formatUsdAmount(parseFloat(state.state.gasEstimate.gasCostEth) * usdPrice)
              : undefined
          }
          solverFee={
            state.state.status === "ready" && usdPrice && state.state.amounts.solverFee > 0
              ? formatUsdAmount(state.state.amounts.solverFee * usdPrice)
              : undefined
          }
          isCrossChain={DepositSelectors.isCrossChain()}
          isLoading={state.state.status === "preparing"}
        />

        {/* You Receive */}
        <CardContainer>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-neutral-400">You Receive (Deposit Note)</span>
            <DepositNoteInfo />
          </div>

          <div className="flex items-center justify-between gap-3">
            <AssetPill asset={asset} chainId={POOL_CHAIN.id} disabled />
            <AmountInput value={noteAmount > 0 ? formatDisplayAmount(noteAmount) : "0"} disabled />
          </div>

          <div className="flex items-center justify-between py-1">
            <PriceDisplay symbol={asset.symbol} priceUsd={usdPrice} />
            <AmountUsd amountUsd={noteAmountUsd} />
          </div>
        </CardContainer>
      </div>
    </ScreenLayout>
  );
}
