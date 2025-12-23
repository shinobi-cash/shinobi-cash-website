/**
 * Deposit Form - Refactored
 * Pure UI component that delegates all logic to useDepositController
 */

import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChainId } from "wagmi";
import { Button } from "@workspace/ui/components/button";
import { NetworkWarning } from "./NetworkWarning";
import { POOL_CHAIN } from "@shinobi-cash/constants";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { InputLabel } from "@/components/shared/InputLabel";
import { TokenBalance } from "@/components/shared/TokenBalance";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { BackButton } from "@/components/ui/back-button";
import { CircleQuestionMarkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@workspace/ui/components/tooltip";
import { modal } from "@/context";
import { useDepositController } from "../controller/useDepositController";
import { showToast } from "@/lib/toast";
import { DEPOSIT_STATUS_LABELS } from "../types/depositStatus";

function DepositNoteInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleQuestionMarkIcon className="h-5 w-5" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Amount after deducting 1% compliance fee</p>
      </TooltipContent>
    </Tooltip>
  );
}

interface DepositFormProps {
  asset: { symbol: string; name: string; icon: string };
  onTransactionSuccess?: () => void;
  onBack?: () => void;
}

export function DepositForm({ asset, onTransactionSuccess, onBack }: DepositFormProps) {
  const chainId = useChainId();
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);

  // All deposit logic is in the controller
  const controller = useDepositController(asset, onTransactionSuccess);

  // Track shown errors to prevent duplicate toasts
  const shownErrorsRef = useRef(new Set<string>());

  // Handle error toasts (UI side effect with domain-specific messages)
  useEffect(() => {
    if (controller.lastError) {
      const errorKey = `${controller.lastError.type}:${controller.lastError.message}`;
      if (!shownErrorsRef.current.has(errorKey)) {
        shownErrorsRef.current.add(errorKey);

        const errorMessage =
          controller.lastError.type === "gas"
            ? "Gas estimation failed"
            : controller.lastError.type === "commitment"
              ? "Note generation failed"
              : "Transaction failed";

        showToast.error(errorMessage, { duration: 5000 });
      }
    }
  }, [controller.lastError]);

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

  // Asset/Chain Selector Screen
  if (isAssetSelectorOpen) {
    return (
      <div className="flex h-full flex-col bg-gray-900">
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAssetSelectorOpen(false)}
            className="h-8 w-8 p-0"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Button>
          <h2 className="text-lg font-semibold text-white">Select Asset & Chain</h2>
        </div>

        <AssetChainSelectorScreen
          selectedChainId={chainId}
          selectedAsset={asset}
          onSelect={() => setIsAssetSelectorOpen(false)}
          onBack={() => {}}
        />
      </div>
    );
  }

  // Main Deposit Form
  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-4">
          <BackButton onClick={onBack} />
          <h2 className="text-lg font-semibold text-white">Deposit</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
        {/* Unsupported Network Warning */}
        {!controller.isOnSupportedChain && (
          <div className="mb-6">
            <NetworkWarning
              type="warning"
              title="Unsupported Network"
              message="Please switch to a supported network in your wallet"
            />
          </div>
        )}

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
        <TokenAmountInput
          amount={controller.amount}
          onAmountChange={controller.setAmount}
          disabled={controller.isDepositing || !controller.isOnSupportedChain}
          rightElement={
            <TokenChainSelector
              asset={asset}
              chainId={chainId}
              onClick={() => setIsAssetSelectorOpen(true)}
              disabled={controller.isDepositing || !controller.isOnSupportedChain}
              showChevron={true}
            />
          }
        />

        {/* Balance and Max Button */}
        <TokenBalance
          balance={controller.balance}
          usdValue={(parseFloat(controller.balance) * 0).toString()}
          assetSymbol={asset.symbol}
          onMaxClick={() => controller.setAmount(controller.balance)}
          disabled={!controller.hasBalance || controller.isDepositing}
        />

        {/* Error Messages */}
        {controller.amountError && (
          <p className="mt-1 text-sm text-red-500">{controller.amountError}</p>
        )}
        {controller.gasEstimationError && controller.amount && !controller.amountError && (
          <p className="mt-1 text-sm text-red-500">{controller.gasEstimationError}</p>
        )}

        {/* Arrow Divider */}
        <SectionDivider />

        {/* You Receive Section */}
        <InputLabel label="You Receive (Deposit Note)" labelRight={<DepositNoteInfo />} />
        <TokenAmountInput
          amount={controller.depositNoteAmount > 0 ? controller.depositNoteAmount.toFixed(4) : "0"}
          onAmountChange={() => {}} // Read-only
          readOnly={true}
          rightElement={
            <TokenChainSelector asset={asset} chainId={POOL_CHAIN.id} showChevron={false} />
          }
        />

        {/* Fee Breakdown */}
        <FeeBreakdown
          gasCost={controller.gasCostEth}
          assetSymbol={asset.symbol}
          isEstimatingGas={controller.isEstimatingGas}
        />

        {/* Submit Button */}
        <div className="mt-2 sm:mt-4">
          <Button
            disabled={!controller.canDeposit}
            onClick={controller.deposit}
            className="h-12 w-full rounded-xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50 sm:h-14 sm:text-lg"
            size="lg"
          >
            {controller.status === "submitting" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {DEPOSIT_STATUS_LABELS[controller.status]}
              </div>
            ) : (
              DEPOSIT_STATUS_LABELS[controller.status]
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
