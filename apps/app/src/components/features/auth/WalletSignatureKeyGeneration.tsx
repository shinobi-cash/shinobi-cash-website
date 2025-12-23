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
import { Button } from "@workspace/ui/components/button";
import { getEIP712Message } from "@/utils/eip712";

interface WalletSignatureKeyGenerationProps {
  onKeyGenerationComplete: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  onLoginChoice?: () => void;
  registerFooterActions?: (
    primary: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null,
    secondary?: {
      label: string;
      onClick: () => void;
      variant?: "default" | "outline" | "ghost";
      disabled?: boolean;
      icon?: React.ReactNode;
    } | null
  ) => void;
}

type GenerationStep = "connect" | "sign" | "deriving" | "complete" | "error";

export function WalletSignatureKeyGeneration({
  onKeyGenerationComplete,
  onLoginChoice,
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

      // Get EIP-712 typed data
      const typedData = getEIP712Message(address, chainId);

      // Request signature
      const signature = await signTypedDataAsync(typedData);

      // Split signature into two parts:
      // - First 64 chars (32 bytes) for key generation
      // - Last 64 chars (32 bytes) for encryption key
      const signatureHex = signature.slice(2); // Remove '0x' prefix

      if (signatureHex.length < 128) {
        throw new Error("Signature too short for splitting");
      }

      const keyGenSeed = signatureHex.slice(0, 64); // First 32 bytes
      const encryptionSeed = signatureHex.slice(64, 128); // Next 32 bytes

      // Generate keys from first half of signature
      const keys = generateKeysFromRandomSeed(keyGenSeed);

      // Convert second half to Uint8Array for encryption
      const encryptionKey = new Uint8Array(
        encryptionSeed.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );

      setCurrentStep("complete");

      // Small delay for better UX
      setTimeout(() => {
        onKeyGenerationComplete({
          keys,
          encryptionKey,
          walletAddress: address,
        });
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

    const secondaryAction = onLoginChoice
      ? {
          label: "Sign in instead",
          onClick: onLoginChoice,
          variant: "ghost" as const,
        }
      : null;

    if (currentStep === "connect") {
      registerFooterActions(
        {
          label: "Connect Wallet",
          onClick: handleConnectWallet,
          variant: "default",
        },
        secondaryAction
      );
    } else if (currentStep === "sign") {
      registerFooterActions(
        {
          label: "Sign Message",
          onClick: handleSignMessage,
          variant: "default",
          disabled: isSigning,
        },
        secondaryAction
      );
    } else {
      registerFooterActions(null, null);
    }
  }, [
    currentStep,
    registerFooterActions,
    handleConnectWallet,
    handleSignMessage,
    isSigning,
    onLoginChoice,
  ]);

  // Render based on current step
  if (currentStep === "connect") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-600/20">
            <WalletIcon className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Connect Your Wallet</h3>
            <p className="text-app-secondary text-sm">
              Connect your wallet to create your Shinobi Cash account. Your keys will be derived
              from your wallet signature.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "sign") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/20">
            <WalletIcon className="h-8 w-8 text-orange-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Sign Message</h3>
            <p className="text-app-secondary mb-4 text-sm">
              Sign a message with your wallet to generate your account keys. This is free and won't
              send any transactions.
            </p>
            {address && (
              <div className="bg-app-card rounded-lg px-3 py-2">
                <p className="text-app-tertiary mb-1 text-xs">Connected Wallet</p>
                <p className="text-app-primary truncate font-mono text-sm">{address}</p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950/20">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            💡 Your signature generates a unique seed for your account. You can always recover your
            account by signing the same message with this wallet.
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === "deriving") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Generating Keys</h3>
            <p className="text-app-secondary text-sm">
              Deriving your account keys from wallet signature...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "complete") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-600/20">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Keys Generated!</h3>
            <p className="text-app-secondary text-sm">
              Your account keys have been created successfully.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === "error") {
    return (
      <div className="space-y-4">
        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <div>
            <h3 className="text-app-primary mb-2 text-lg font-semibold">Error</h3>
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
