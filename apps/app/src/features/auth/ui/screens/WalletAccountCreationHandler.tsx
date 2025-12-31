/**
 * Wallet Account Creation Handler
 * Handles wallet connection, signing, and account creation
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useSignTypedData, useAccount, useChainId, useConnect } from "wagmi";
import { useAuthActions } from "../../hooks/useAuthStore";
import { AuthErrorCode } from "../../domain/types";
import { getEIP712Message } from "../../wallet/eip712";
import { generateKeysFromWalletSignature } from "../../shared";

export function WalletAccountCreationHandler() {
  const { signTypedDataAsync } = useSignTypedData();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();

  const { bootstrap, setError } = useAuthActions();

  const [isConnecting, setIsConnecting] = useState(false);
  const creationTriggeredRef = useRef(false);

  useEffect(() => {
    const triggerCreation = async () => {
      // Step 1: Ensure wallet is connected
      if (!isConnected || !address) {
        if (creationTriggeredRef.current || isConnecting) return;

        creationTriggeredRef.current = true;
        setIsConnecting(true);

        try {
          const connector = connectors[0];
          if (!connector) {
            throw new Error("No wallet connector available");
          }

          await connect({ connector });

          // Effect will re-run once connected
          creationTriggeredRef.current = false;
        } catch (error) {
          creationTriggeredRef.current = false;
          setIsConnecting(false);

          setError(
            {
              code: AuthErrorCode.WALLET_NOT_CONNECTED,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to connect wallet",
              timestamp: Date.now(),
              originalError: error,
            },
            () => triggerCreation()
          );
        }
        return;
      }

      // Step 2: Wallet connected → create account
      if (creationTriggeredRef.current) return;
      creationTriggeredRef.current = true;
      setIsConnecting(false);

      try {
        const message = getEIP712Message(
          address as `0x${string}`,
          chainId,
          { deterministic: true }
        );

        const signature = await signTypedDataAsync(message);

        const keys = await generateKeysFromWalletSignature(
          signature,
          chainId,
          address
        );

        const { createAccount } = await import("../../services/walletService");
        await createAccount(address, signature, chainId, keys);

        // Persist session info for auto-resume
        const { KDF } = await import("@/lib/storage");
        const accountId = `${address.toLowerCase()}:chain-${chainId}`;
        await KDF.storeSessionInfo(accountId, "wallet");

        // 🔁 Re-bootstrap auth (single source of truth)
        await bootstrap();
      } catch (error) {
        creationTriggeredRef.current = false;

        setError(
          {
            code: AuthErrorCode.WALLET_SIGNATURE_FAILED,
            message:
              error instanceof Error
                ? error.message
                : "Failed to create wallet account",
            timestamp: Date.now(),
            originalError: error,
          },
          () => triggerCreation()
        );
      }
    };

    triggerCreation();
  }, [
    address,
    chainId,
    isConnected,
    connectors,
    connect,
    signTypedDataAsync,
    bootstrap,
    setError,
    isConnecting,
  ]);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">
        {isConnecting ? "Connect Wallet" : "Creating Account"}
      </h2>
      <p className="mt-2 text-center text-sm text-gray-400">
        {isConnecting
          ? "Please connect your wallet to continue."
          : "Please sign the message in your wallet to create your account."}
      </p>
    </div>
  );
}
