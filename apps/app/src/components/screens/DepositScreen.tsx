import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/contexts/NavigationContext";
import { useDepositCommitment } from "@/hooks/deposit/useDepositCommitment";
import { useDepositFormState } from "@/hooks/deposit/useDepositFormState";
import { useTransactionTracking } from "@/hooks/transactions/useTransactionTracking";
import { showToast } from "@/lib/toast";
import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { useDepositTransaction } from "../../hooks/deposit/useDepositTransaction";
import { ScreenHeader } from "../layout/ScreenHeader";
import { ScreenContent } from "../layout/ScreenLayout";
import { Button } from "../ui/button";
import { ChainSelector } from "../features/deposit/ChainSelector";
import { DepositAmountInput } from "../features/deposit/DepositAmountInput";
import { NetworkWarning } from "../features/deposit/NetworkWarning";
import { POOL_CHAIN, SHINOBI_CASH_SUPPORTED_CHAINS } from "@shinobi-cash/constants";

export const DepositScreen = () => {
  const { currentAsset } = useNavigation();

  // Default to ETH if no asset context (fallback)
  const asset = currentAsset || { symbol: "ETH", name: "Ethereum", icon: "/ethereum.svg" };

  const breadcrumbs = [{ label: "Pool", screen: "home" as const }, { label: asset.symbol }, { label: "Deposit" }];

  return (
    <>
      <ScreenHeader breadcrumbs={breadcrumbs} backTo="home" />
      <ScreenContent>
        <DepositForm asset={asset} />
      </ScreenContent>
    </>
  );
};

const DepositForm = ({ asset }: { asset: { symbol: string; name: string; icon: string } }) => {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { trackTransaction } = useTransactionTracking();
  const { publicKey, accountKey } = useAuth();

  const availableBalance = balance?.value ?? BigInt(0);

  // Use custom hook for form state management
  const { amount, amountError, handleAmountChange, resetForm } = useDepositFormState({
    availableBalance,
  });

  // Get current chain deposit type
  const isCrossChainDeposit = chainId !== POOL_CHAIN.id;

  // ---- Chain Switching ----
  const handleChainSwitch = useCallback((newChainId: number) => {
    if (switchChain && newChainId !== chainId) {
      switchChain({ chainId: newChainId });
    }
  }, [switchChain, chainId]);

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
      }, 1000);
    }
  }, [isSuccess, transactionHash, reset, resetForm, trackTransaction, chainId]);

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
          Preparing Transaction...
        </div>
      );
    }
    if (isGeneratingNote || !hasNoteData) return "Preparing...";
    if (!isOnSupportedChain) return "Unsupported Network";
    if (!hasBalance) return "Insufficient Balance";
    if (amountError) return "Enter Amount";
    return isCrossChainDeposit ? "Initiate Cross-Chain Deposit" : "Deposit to Pool";
  };

  return (
    <div className="h-full flex flex-col px-4 py-4">
      {/* Connected Address */}
      <div className="mb-6">
        <p className="text-xs text-app-secondary font-bold mb-1">Connected Address</p>
        <p className="text-xs text-app-primary font-mono">{address}</p>
      </div>

      {/* Chain Selector */}
      <ChainSelector
        selectedChainId={chainId}
        onChainSelect={handleChainSwitch}
        label="Depositing From"
        showTimeIndicators={true}
        groupByType={true}
      />

      {/* Unsupported Network Warning */}
      {!isOnSupportedChain && (
        <NetworkWarning
          type="warning"
          title="Unsupported Network"
          message="Please select a supported chain from the dropdown above"
        />
      )}

      {/* Amount Input with Balance */}
      <DepositAmountInput
        amount={amount}
        onAmountChange={handleAmountChange}
        asset={asset}
        balance={balance?.value ?? null}
        error={amountError}
      />

      {/* Submit Button */}
      <div className="mt-auto">
        <Button
          disabled={!canMakeDeposit}
          onClick={handleDeposit}
          className="w-full h-11 rounded-xl text-sm font-medium"
          size="lg"
        >
          {getButtonLabel()}
        </Button>
      </div>
    </div>
  );
};
