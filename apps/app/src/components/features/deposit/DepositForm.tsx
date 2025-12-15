import { useAuth } from "@/contexts/AuthContext";
import { useDepositCommitment } from "@/hooks/deposit/useDepositCommitment";
import { useDepositFormState } from "@/hooks/deposit/useDepositFormState";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { showToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { useDepositTransaction } from "@/hooks/deposit/useDepositTransaction";
import { Button } from "@/components/ui/button";
import { NetworkWarning } from "./NetworkWarning";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";
import Image from "next/image";
import { formatEther } from "viem";

interface DepositFormProps {
  asset: { symbol: string; name: string; icon: string };
  onTransactionSuccess?: () => void;
}

export function DepositForm({ asset, onTransactionSuccess }: DepositFormProps) {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { trackTransaction } = useTransactionTracking();
  const { publicKey, accountKey } = useAuth();

  const availableBalance = balance?.value ?? BigInt(0);

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

  // ---- Chain Icon Helper ----
  const getChainIcon = () => {
    const chainIconMap: Record<number, string> = {
      // Mainnets
      1: "/chains/eth-diamond-black-white.svg", // Ethereum Mainnet
      8453: "/chains/Base_square_blue.svg", // Base Mainnet
      10: "/chains/OPMainnet_square.svg", // Optimism Mainnet
      42161: "/chains/AF_logomark.svg", // Arbitrum One
      // Testnets
      421614: "/chains/AF_logomark.svg", // Arbitrum Sepolia
      84532: "/chains/Base_square_blue.svg", // Base Sepolia
      11155111: "/chains/eth-diamond-black-white.svg", // Sepolia
      11155420: "/chains/OPMainnet_square.svg", // OP Sepolia
    };
    return chainIconMap[chainId] || "/chains/eth-diamond-black-white.svg";
  };

  // ---- Button Label ----
  const getButtonLabel = () => {
    if (isLoading) {
      return (
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Preparing Transaction...
        </div>
      );
    }
    if (isGeneratingNote || !hasNoteData) return "Preparing...";
    if (!isOnSupportedChain) return "Unsupported Network";
    if (!hasBalance) return "Insufficient Balance";
    if (amountError) return "Enter Amount";
    return "Continue";
  };

  const formattedBalance = balance?.value ? formatEther(balance.value) : "0";

  return (
    <div className="h-full flex flex-col px-4 sm:px-6 py-6">
      {/* Asset Icon with Chain Badge */}
      <div className="flex flex-col items-center mb-8 sm:mb-10">
        <div className="relative mb-3 sm:mb-4">
          {/* Main Asset Icon */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-blue-600 rounded-full flex items-center justify-center">
            <Image
              src={asset.icon}
              alt={asset.symbol}
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>

          {/* Chain Badge */}
          <div className="absolute -bottom-1 -right-1 w-8 h-8 sm:w-9 sm:h-9 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-gray-900">
            <Image
              src={getChainIcon()}
              alt="Chain"
              width={20}
              height={20}
              className="w-5 h-5 sm:w-6 sm:h-6"
            />
          </div>
        </div>

        {/* Asset Symbol */}
        <h2 className="text-2xl sm:text-3xl font-bold text-white">{asset.symbol}</h2>
      </div>

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

      {/* Amount Section */}
      <div className="flex-1 flex flex-col">
        <label className="text-base sm:text-lg font-medium text-white mb-3">
          Amount
        </label>

        {/* Amount Input */}
        <div className="relative mb-3">
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="w-full px-4 py-4 sm:py-5 bg-gray-800 border border-gray-700 rounded-xl text-white text-lg sm:text-xl font-medium focus:outline-none focus:border-orange-600 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            disabled={isTransacting || !isOnSupportedChain}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <span className="text-gray-400 text-base sm:text-lg font-medium">{asset.symbol}</span>
          </div>
        </div>

        {/* Balance and Max Button */}
        <div className="flex items-center justify-between text-sm sm:text-base mb-2">
          <span className="text-gray-400">
            ${(Number.parseFloat(formattedBalance) * 0).toFixed(2)}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">
              {Number.parseFloat(formattedBalance).toFixed(4)} {asset.symbol} available
            </span>
            <button
              onClick={() => handleAmountChange(formattedBalance)}
              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              disabled={!hasBalance || isTransacting}
            >
              Max
            </button>
          </div>
        </div>

        {/* Error Message */}
        {amountError && (
          <p className="text-red-500 text-sm mt-1">{amountError}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="mt-6 sm:mt-8">
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
  );
}
