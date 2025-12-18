import { useAuth } from "@/contexts/AuthContext";
import { useDepositCommitment } from "@/hooks/deposit/useDepositCommitment";
import { useDepositFormState } from "@/hooks/deposit/useDepositFormState";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { showToast } from "@/lib/toast";
import { Loader2, Copy, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { useDepositTransaction } from "@/hooks/deposit/useDepositTransaction";
import { Button } from "@/components/ui/button";
import { NetworkWarning } from "./NetworkWarning";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import { formatEther } from "viem";
import { TokenAmountInput } from "@/components/shared/TokenAmountInput";
import { InputLabel } from "@/components/shared/InputLabel";
import { TokenBalance } from "@/components/shared/TokenBalance";
import { SectionDivider } from "@/components/shared/SectionDivider";
import { FeeBreakdown } from "@/components/shared/FeeBreakdown";
import { TokenChainSelector } from "@/components/shared/TokenChainSelector";
import { AssetChainSelectorScreen } from "@/components/shared/AssetChainSelectorScreen";
import { BackButton } from "@/components/ui/back-button";
import { CircleQuestionMarkIcon } from 'lucide-react'

interface DepositFormProps {
  asset: { symbol: string; name: string; icon: string };
  onTransactionSuccess?: () => void;
  onBack?: () => void;
}

export function DepositForm({ asset, onTransactionSuccess, onBack }: DepositFormProps) {
  const { isConnected, address } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { trackTransaction } = useTransactionTracking();
  const { publicKey, accountKey } = useAuth();
  const [isAssetSelectorOpen, setIsAssetSelectorOpen] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(false);
  
  const availableBalance = balance?.value ?? BigInt(0);

  // Copy address handler
  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch (error) {
      console.warn("Copy failed:", error);
    }
  };

  const handleConnectWallet = () => {
      modal.open();
    };

  // Use custom hook for form state management
  const { amount, amountError, handleAmountChange, resetForm } = useDepositFormState({
    availableBalance,
  });

  // ---- Transaction Hooks ----
  const isOnSupportedChain = SHINOBI_CASH_SUPPORTED_CHAINS.some(chain => chain.id === chainId);
  const { noteData, isGeneratingNote, error: noteError, regenerateNote } = useDepositCommitment(publicKey, accountKey);
  const { deposit, reset, clearError, isLoading, isSuccess, error, transactionHash } = useDepositTransaction();

  // ---- Error + Success Tracking ----
  const shownErrorsRef = useRef(new Set<string>());
  const shownTxsRef = useRef(new Set<string>());

  // Transaction error toast
  useEffect(() => {
    if (error && !shownErrorsRef.current.has(error)) {
      shownErrorsRef.current.add(error);
      showToast.error("Transaction failed", { duration: 5000 });
    }
  }, [error]);

  // Retry note silently (with cleanup)
  useEffect(() => {
    if (!noteError) return;
    console.warn("Note generation failed, auto-retrying:", noteError);
    const timer = setTimeout(() => regenerateNote(), 1000);
    return () => clearTimeout(timer);
  }, [noteError, regenerateNote]);

  // Success handler
  useEffect(() => {
    if (isSuccess && transactionHash && !shownTxsRef.current.has(transactionHash)) {
      shownTxsRef.current.add(transactionHash);
      // Track transaction on the chain where it was executed
      trackTransaction(transactionHash, chainId);

      setTimeout(() => {
        reset();
        resetForm();
        onTransactionSuccess?.();
      }, 1000);
    }
  }, [isSuccess, transactionHash, reset, resetForm, trackTransaction, chainId, onTransactionSuccess]);

  // ---- Deposit Action ----
  const handleDeposit = () => {
    if (!noteData || !amount || amountError) return;
    clearError();
    shownErrorsRef.current.clear();
    deposit(amount, noteData);
  };

  // ---- Derived Flags ----
  const isTransacting = isLoading;
  const hasNoteData = !!noteData;
  const hasBalance = availableBalance > BigInt(0);
  const canMakeDeposit =
    !amountError && amount.trim() && isOnSupportedChain && hasNoteData && hasBalance && !isTransacting;

  // ---- Button Label ----
  const getButtonLabel = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Depositing...
        </div>
      );
    }
    if (!isConnected || !address) return "Connect Wallet";
    if (isGeneratingNote || !hasNoteData) return "Preparing...";
    if (!isOnSupportedChain) return "Unsupported Network";
    if (!hasBalance) return "Insufficient Balance";
    if (amountError) return "Enter Amount";
    return "Deposit";
  };

  const formattedBalance = balance?.value ? formatEther(balance.value) : "0";

  // Calculate deposit note amount (after fees)
  const depositAmount = parseFloat(amount) || 0;
  const aspFeeBPS = 500; // 5%
  const solverFeeBPS = chainId !== POOL_CHAIN.id ? 500 : 0; // 5% if cross-chain
  const aspFee = (depositAmount * aspFeeBPS) / 10000;
  const solverFee = (depositAmount * solverFeeBPS) / 10000;
  const depositNoteAmount = depositAmount - aspFee - solverFee;
  const isCrossChain = chainId !== POOL_CHAIN.id;

  // Show Asset/Chain Selector
  if (isAssetSelectorOpen) {
    return (
      <div className="flex flex-col h-full bg-gray-900">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAssetSelectorOpen(false)}
            className="h-8 w-8 p-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <h2 className="text-lg font-semibold text-white">Select Asset & Chain</h2>
        </div>

        <AssetChainSelectorScreen
          selectedChainId={chainId}
          selectedAsset={asset}
          onSelect={() => {
            // For now, we can't actually switch chains in deposit
            // This would require wallet chain switching
            // Just close the selector for now
            setIsAssetSelectorOpen(false);
          }}
          onBack={() => {}}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-x-hidden">
      {/* Header with Back Button */}
      {onBack && (
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-800">
          <BackButton onClick={onBack} />
          <h2 className="text-lg font-semibold text-white">Deposit</h2>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        {/* Unsupported Network Warning */}
      {!isOnSupportedChain && (
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
          address ? (
            <Button
              onClick={handleCopyAddress}
              variant="ghost"
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1.5 h-auto p-0"
            >
              {address.slice(0, 6)}...{address.slice(-4)}
              {copiedAddress ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleConnectWallet}
              className="text-sm text-purple-400 hover:text-purple-300 transition-colors h-auto p-0"
            >
              Connect Wallet
            </Button>
          )
        }
      />
      <TokenAmountInput
        amount={amount}
        onAmountChange={handleAmountChange}
        disabled={isTransacting || !isOnSupportedChain}
        rightElement={
          <TokenChainSelector
            asset={asset}
            chainId={chainId}
            onClick={() => setIsAssetSelectorOpen(true)}
            disabled={isTransacting || !isOnSupportedChain}
            showChevron={true}
          />
        }
      />

      {/* Balance and Max Button */}
      <TokenBalance
        balance={formattedBalance}
        usdValue={(Number.parseFloat(formattedBalance) * 0).toString()}
        assetSymbol={asset.symbol}
        onMaxClick={() => handleAmountChange(formattedBalance)}
        disabled={!hasBalance || isTransacting}
      />

      {/* Error Message */}
      {amountError && (
        <p className="text-red-500 text-sm mt-1">{amountError}</p>
      )}

      {/* Arrow Divider */}
      <SectionDivider />

      {/* You Receive Section */}
      <InputLabel label="You Receive (Deposit Note)" labelRight={<DepositNoteInfo />} />
      <TokenAmountInput
        amount={depositNoteAmount > 0 ? depositNoteAmount.toFixed(4) : "0"}
        onAmountChange={() => {}} // Read-only
        readOnly={true}
        rightElement={
          <TokenChainSelector
            asset={asset}
            chainId={POOL_CHAIN.id}
            showChevron={false}
          />
        }
      />

      {/* Fee Breakdown (Collapsible) */}
      <FeeBreakdown
        depositAmount={depositAmount}
        aspFee={aspFee}
        solverFee={solverFee}
        totalNote={depositNoteAmount}
        assetSymbol={asset.symbol}
        isCrossChain={isCrossChain}
      />

      {/* Submit Button */}
      <div className="mt-2 sm:mt-4">
        <Button
          disabled={!canMakeDeposit}
          onClick={handleDeposit}
          className="w-full h-12 sm:h-14 rounded-xl text-base sm:text-lg font-semibold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          size="lg"
        >
          {getButtonLabel()}
        </Button>
      </div>
      </div>
    </div>
  );
}



import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { modal } from "@/context";
function DepositNoteInfo() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <CircleQuestionMarkIcon className="w-5 h-5" />
      </TooltipTrigger>
      <TooltipContent>
        <p>Value after deducting Vetting Fee (0.01%) </p>
      </TooltipContent>
    </Tooltip>
  )
}