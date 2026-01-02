/**
 * Deposit Form - Refactored
 * Pure UI component that delegates all logic to useDepositController
 */

import { Copy, Check, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useChainId, useSwitchChain } from "wagmi";
import { Button } from "@workspace/ui/components/button";
import { NetworkWarning } from "./NetworkWarning";
import { POOL_CHAIN } from "@shinobi-cash/constants";
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
import { useDepositController } from "../controller/useDepositController";
import { showToast } from "@/lib/toast";
import { DEPOSIT_STATUS_LABELS } from "../types/depositStatus";
import { getUserMessage } from "@/lib/errors/errorHandler";
import { BackButton } from "@/components/ui/back-button";

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
}

export function DepositForm({ asset, onTransactionSuccess }: DepositFormProps) {
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
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

  // Asset/Chain Selector Screen
  if (isAssetSelectorOpen) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-gray-800 px-4 py-2">
          <BackButton onClick={() => setIsAssetSelectorOpen(false)} />
          <h2 className="text-lg font-semibold text-white">Select Asset & Chain</h2>
        </div>

        <AssetChainSelectorScreen
          selectedChainId={chainId}
          onChainChange={(newChainId) => {
            switchChain?.({ chainId: newChainId });
          }}
          onSelect={() => {
            setIsAssetSelectorOpen(false);
          }}
        />
      </div>
    );
  }

  // Main Deposit Form
  return (
    <div className="flex h-full w-full flex-col overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
      <div className="flex-1 space-y-2 overflow-y-auto">
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
            onClick={() => setIsAssetSelectorOpen(true)}
            disabled={controller.isDepositing || !controller.isOnSupportedChain}
            showChevron={true}
          />
        </TokenAmountInputWithBalance>

        {/* Error Messages */}
        {controller.amountError && (
          <p className="mt-1 text-sm text-red-500">{controller.amountError}</p>
        )}
        {controller.gasEstimationError && controller.amount && !controller.amountError && (
          <p className="mt-1 text-sm text-red-500">
            {getUserMessage(new Error(controller.gasEstimationError))}
          </p>
        )}

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
          isEstimating={controller.isEstimatingGas}
          decimals={6}
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
