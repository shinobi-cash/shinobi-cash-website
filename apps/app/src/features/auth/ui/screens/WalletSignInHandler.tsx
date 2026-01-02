/**
 * Wallet Sign In Handler
 * Unified handler for wallet authentication
 * - Tries to login with existing account first
 * - Creates new account if account doesn't exist
 * - Simplified: One button, smart detection
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useSignTypedData, useAccount, useChainId, useConnect } from "wagmi";
import { useAuthActions } from "../../hooks/useAuthStore";
import { AuthErrorCode } from "../../domain/types";
import { getEIP712Message } from "../../wallet/eip712";
import { generateKeysFromWalletSignature } from "../../shared";

export function WalletSignInHandler() {
  const { signTypedDataAsync } = useSignTypedData();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();

  const { bootstrap, setError, markAuthenticated } = useAuthActions();

  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<"connecting" | "signing" | "authenticating">("connecting");
  const signInTriggeredRef = useRef(false);

  useEffect(() => {
    const triggerSignIn = async () => {
      // Step 1: Ensure wallet is connected
      if (!isConnected || !address) {
        if (signInTriggeredRef.current || isConnecting) return;

        signInTriggeredRef.current = true;
        setIsConnecting(true);
        setStatus("connecting");

        try {
          const connector = connectors[0];
          if (!connector) {
            throw new Error("No wallet connector available");
          }

          await connect({ connector });

          // Effect will re-run once connected
          signInTriggeredRef.current = false;
        } catch (error) {
          signInTriggeredRef.current = false;
          setIsConnecting(false);

          setError(
            {
              code: AuthErrorCode.WALLET_NOT_CONNECTED,
              message: error instanceof Error ? error.message : "Failed to connect wallet",
              timestamp: Date.now(),
              originalError: error,
            },
            () => triggerSignIn()
          );
        }
        return;
      }

      // Step 2: Wallet connected → sign and authenticate
      if (signInTriggeredRef.current) return;
      signInTriggeredRef.current = true;
      setIsConnecting(false);
      setStatus("signing");

      try {
        const message = getEIP712Message(address as `0x${string}`, chainId, {
          deterministic: true,
        });

        const signature = await signTypedDataAsync(message);
        setStatus("authenticating");

        // Step 3: Try to login first
        const { login, createAccount } = await import("../../services/walletService");

        try {
          // Attempt login with existing account
          await login(signature, address, chainId);
          console.debug("[WalletSignIn] Logged in with existing account");
        } catch (loginError: any) {
          // If account doesn't exist, create it
          if (loginError?.code === AuthErrorCode.ACCOUNT_NOT_FOUND) {
            console.debug("[WalletSignIn] Account not found, creating new account");
            const keys = await generateKeysFromWalletSignature(signature, chainId, address);
            await createAccount(address, signature, chainId, keys);
            console.debug("[WalletSignIn] New account created");
          } else {
            // Other login errors → re-throw
            throw loginError;
          }
        }

        // Persist session info for auto-resume (for next page load)
        const { KDF, storageManager } = await import("@/lib/storage");
        const accountId = `${address.toLowerCase()}:chain-${chainId}`;

        // Store wallet session
        await KDF.storeSessionInfo(accountId, "wallet");

        // Check if account has passkey enabled and restore to session
        const accountData = await storageManager.getAccountData();
        if (accountData?.passkeyUnlock?.enabled && accountData.passkeyUnlock.credentialId) {
          console.debug("[WalletSignIn] Restoring passkey credential to session");
          await KDF.addPasskeyToSession(accountData.passkeyUnlock.credentialId);
        }

        // Mark authenticated (don't call bootstrap - we're already authenticated!)
        markAuthenticated(accountId, "wallet");
      } catch (error) {
        signInTriggeredRef.current = false;

        setError(
          {
            code: AuthErrorCode.WALLET_SIGNATURE_FAILED,
            message: error instanceof Error ? error.message : "Failed to sign in with wallet",
            timestamp: Date.now(),
            originalError: error,
          },
          () => triggerSignIn()
        );
      }
    };

    triggerSignIn();
  }, [
    address,
    chainId,
    isConnected,
    connectors,
    connect,
    signTypedDataAsync,
    bootstrap,
    setError,
    markAuthenticated,
    isConnecting,
  ]);

  const getStatusMessage = () => {
    switch (status) {
      case "connecting":
        return "Please connect your wallet to continue.";
      case "signing":
        return "Please sign the message in your wallet.";
      case "authenticating":
        return "Authenticating your account...";
    }
  };

  const getStatusTitle = () => {
    switch (status) {
      case "connecting":
        return "Connect Wallet";
      case "signing":
        return "Sign Message";
      case "authenticating":
        return "Signing In";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">{getStatusTitle()}</h2>
      <p className="mt-2 text-center text-sm text-gray-400">{getStatusMessage()}</p>
    </div>
  );
}
