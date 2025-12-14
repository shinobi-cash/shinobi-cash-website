/**
 * Wallet Signature Key Generation
 * Uses EIP-712 signature to deterministically derive account keys
 * Much better UX than backing up mnemonics
 */

import { type KeyGenerationResult, generateKeysFromRandomSeed } from "@shinobi-cash/core";
import { modal } from "@/context";
import { AlertCircle, Loader2, WalletIcon, CheckCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignTypedData } from "wagmi";
import { Button } from "../../ui/button";

interface WalletSignatureKeyGenerationProps {
  onKeyGenerationComplete: (keys: KeyGenerationResult) => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
    } | null,
  ) => void;
}

type GenerationStep = "connect" | "sign" | "deriving" | "complete" | "error";

// EIP-712 domain and message structure
const DOMAIN = {
  name: "Shinobi Cash",
  version: "1",
  chainId: 1, // Will be overridden with actual chain
} as const;

const TYPES = {
  ShinobiAuth: [
    { name: "message", type: "string" },
    { name: "timestamp", type: "uint256" },
    { name: "action", type: "string" },
  ],
} as const;

export function WalletSignatureKeyGeneration({
  onKeyGenerationComplete,
  registerFooterActions,
}: WalletSignatureKeyGenerationProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("connect");
  const [error, setError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { signTypedDataAsync, isPending: isSigning } = useSignTypedData();

  // Update step based on wallet connection
  useEffect(() => {
    if (isConnected && currentStep === "connect") {
      setCurrentStep("sign");
    } else if (!isConnected && currentStep !== "connect" && currentStep !== "error") {
      setCurrentStep("connect");
    }
  }, [isConnected, currentStep]);

  const handleConnectWallet = useCallback(() => {
    modal.open();
  }, []);

  const handleSignMessage = useCallback(async () => {
    if (!address || !chainId) {
      setError("Wallet not connected");
      setCurrentStep("error");
      return;
    }

    try {
      setCurrentStep("deriving");
      setError(null);

      // Create timestamp for uniqueness
      const timestamp = BigInt(Math.floor(Date.now() / 1000));

      // Prepare EIP-712 message
      const message = {
        message: "Sign this message to create your Shinobi Cash account. This signature will be used to deterministically generate your private keys. This will not trigger any blockchain transaction or cost gas.",
        timestamp,
        action: "create-account",
      };

      const domain = {
        ...DOMAIN,
        chainId,
      };

      // Request signature
      const signature = await signTypedDataAsync({
        domain,
        types: TYPES,
        primaryType: "ShinobiAuth",
        message,
      });

      // Use signature as deterministic seed for key generation
      // Remove '0x' prefix and use as hex seed
      const seed = signature.slice(2);

      // Generate keys from signature seed
      const keys = generateKeysFromRandomSeed(seed);

      setCurrentStep("complete");

      // Small delay for better UX
      setTimeout(() => {
        onKeyGenerationComplete(keys);
      }, 500);
    } catch (err) {
      console.error("Signature failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to sign message";

      // User rejected signature
      if (errorMessage.includes("User rejected") || errorMessage.includes("user rejected")) {
        setError("Signature rejected. Please sign the message to create your account.");
        setCurrentStep("sign");
      } else {
        setError(errorMessage);
        setCurrentStep("error");
      }
    }
  }, [address, chainId, signTypedDataAsync, onKeyGenerationComplete]);

  // Register footer actions
  useEffect(() => {
    if (!registerFooterActions) return;

    if (currentStep === "connect") {
      registerFooterActions(
        {
          label: "Connect Wallet",
          onClick: handleConnectWallet,
          variant: "default",
        },
        null,
      );
    } else if (currentStep === "sign") {
      registerFooterActions(
        {
          label: "Sign Message",
          onClick: handleSignMessage,
          variant: "default",
          disabled: isSigning,
        },
        null,
      );
    } else {
      registerFooterActions(null, null);
    }
  }, [currentStep, registerFooterActions, handleConnectWallet, handleSignMessage, isSigning]);

  // Render based on current step
  if (currentStep === "connect") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto">
            <WalletIcon className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-primary mb-2">Connect Your Wallet</h3>
            <p className="text-sm text-app-secondary">
              Connect your wallet to create your Shinobi Cash account. Your keys will be derived from your wallet
              signature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "sign") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto">
            <WalletIcon className="w-8 h-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-primary mb-2">Sign Message</h3>
            <p className="text-sm text-app-secondary mb-4">
              Sign a message with your wallet to generate your account keys. This is free and won't send any
              transactions.
            </p>
            {address && (
              <div className="bg-app-card px-3 py-2 rounded-lg">
                <p className="text-xs text-app-tertiary mb-1">Connected Wallet</p>
                <p className="text-sm font-mono text-app-primary truncate">{address}</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 flex gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-3">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Your signature generates a unique seed for your account. You can always recover your account by signing
            the same message with this wallet.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === "deriving") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-primary mb-2">Generating Keys</h3>
            <p className="text-sm text-app-secondary">Deriving your account keys from wallet signature...</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "complete") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-green-600/20 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-primary mb-2">Keys Generated!</h3>
            <p className="text-sm text-app-secondary">Your account keys have been created successfully.</p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "error") {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-app-primary mb-2">Error</h3>
            <p className="text-sm text-red-600 dark:text-red-400">{error || "An error occurred"}</p>
          </div>
        </div>
        <Button onClick={() => setCurrentStep("connect")} variant="outline" className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  return null;
}
