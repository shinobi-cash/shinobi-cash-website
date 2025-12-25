/**
 * Wallet Signature Key Generation
 * Uses EIP-712 signature with HKDF to deterministically derive account keys
 * Much better UX than backing up mnemonics
 *
 * SECURITY: Uses HKDF-based key derivation with chain binding
 * @file features/auth/components/WalletSignatureKeyGeneration.tsx
 */

import { type KeyGenerationResult } from "@shinobi-cash/core";
import { modal } from "@/context";
import { AlertCircle, Loader2, WalletIcon, CheckCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Button } from "@workspace/ui/components/button";
import { useWalletAuth } from "@/features/auth";

interface WalletSignatureKeyGenerationProps {
  onKeyGenerationComplete: (data: {
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  }) => void;
  onLoginChoice?: () => void;
}

type GenerationStep = "connect" | "sign" | "deriving" | "complete" | "error";

export function WalletSignatureKeyGeneration({
  onKeyGenerationComplete,
  onLoginChoice,
}: WalletSignatureKeyGenerationProps) {
  const [currentStep, setCurrentStep] = useState<GenerationStep>("connect");
  const [error, setError] = useState<string | null>(null);
  const [generatedResult, setGeneratedResult] = useState<{
    keys: KeyGenerationResult;
    encryptionKey: Uint8Array;
    walletAddress: string;
  } | null>(null);

  const { address, isConnected } = useAccount();
  const walletAuth = useWalletAuth();

  // Update step based on wallet connection
  useEffect(() => {
    if (isConnected && currentStep === "connect") {
      setCurrentStep("sign");
    } else if (!isConnected && currentStep !== "connect" && currentStep !== "error") {
      setCurrentStep("connect");
    }
  }, [isConnected, currentStep]);

  // Handle completion with proper cleanup
  useEffect(() => {
    if (currentStep !== "complete" || !generatedResult) return;

    // Small delay for better UX
    const timeoutId = setTimeout(() => {
      onKeyGenerationComplete(generatedResult);
    }, 500);

    // Cleanup: cancel timeout if component unmounts
    return () => clearTimeout(timeoutId);
  }, [currentStep, generatedResult, onKeyGenerationComplete]);

  const handleConnectWallet = useCallback(() => {
    modal.open();
  }, []);

  const handleSignMessage = useCallback(async () => {
    if (!address || !walletAuth.isWalletConnected) {
      setError("Wallet not connected");
      setCurrentStep("error");
      return;
    }

    try {
      setCurrentStep("deriving");
      setError(null);

      // SECURITY: Use HKDF-based key derivation with chain binding
      const result = await walletAuth.generateKeys();

      if (!result) {
        throw new Error("Failed to generate keys");
      }

      // Store result and transition to complete step
      // useEffect will handle the callback with proper cleanup
      setGeneratedResult({
        keys: result.keys,
        encryptionKey: result.encryptionKey,
        walletAddress: result.walletAddress,
      });
      setCurrentStep("complete");
    } catch (err) {
      console.error("Key generation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to generate keys";

      // User rejected signature
      if (errorMessage.includes("User rejected") || errorMessage.includes("user rejected")) {
        setError("Signature rejected. Please sign the message to create your account.");
        setCurrentStep("sign");
      } else {
        setError(errorMessage);
        setCurrentStep("error");
      }
    }
  }, [address, walletAuth, onKeyGenerationComplete]);

  // Render based on current step
  if (currentStep === "connect") {
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6">
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

        <div className="border-t border-gray-800 px-4 py-4">
          <div className="grid w-full grid-cols-2 gap-3">
            {onLoginChoice && (
              <Button
                variant="ghost"
                onClick={onLoginChoice}
                className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
                size="lg"
              >
                Sign in instead
              </Button>
            )}
            <Button
              variant="default"
              onClick={handleConnectWallet}
              className={`${onLoginChoice ? "col-span-1" : "col-span-2"} min-h-12 w-full rounded-2xl py-3 text-base font-medium`}
              size="lg"
            >
              Connect Wallet
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (currentStep === "sign") {
    return (
      <>
        <div className="flex-1 space-y-4 px-4 py-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-600/20">
              <WalletIcon className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h3 className="text-app-primary mb-2 text-lg font-semibold">Sign Message</h3>
              <p className="text-app-secondary mb-4 text-sm">
                Sign a message with your wallet to generate your account keys. This is free and
                won&apos;t send any transactions.
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
              Your signature generates a unique seed for your account. You can always recover your
              account by signing the same message with this wallet.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <div className="grid w-full grid-cols-2 gap-3">
            {onLoginChoice && (
              <Button
                variant="ghost"
                onClick={onLoginChoice}
                className="col-span-1 min-h-12 w-full rounded-2xl py-3 text-base font-medium"
                size="lg"
              >
                Sign in instead
              </Button>
            )}
            <Button
              variant="default"
              onClick={handleSignMessage}
              className={`${onLoginChoice ? "col-span-1" : "col-span-2"} min-h-12 w-full rounded-2xl py-3 text-base font-medium`}
              size="lg"
            >
              Sign Message
            </Button>
          </div>
        </div>
      </>
    );
  }

  if (currentStep === "deriving") {
    return (
      <div className="flex-1 space-y-4 px-4 py-6">
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
      <div className="flex-1 space-y-4 px-4 py-6">
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
      <>
        <div className="flex-1 space-y-4 px-4 py-6">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-600/20">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <h3 className="text-app-primary mb-2 text-lg font-semibold">Error</h3>
              <p className="text-sm text-red-600 dark:text-red-400">
                {error || "An error occurred"}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 px-4 py-4">
          <Button
            onClick={() => setCurrentStep("connect")}
            variant="outline"
            className="min-h-12 w-full rounded-2xl py-3 text-base font-medium"
            size="lg"
          >
            Try Again
          </Button>
        </div>
      </>
    );
  }

  return null;
}
