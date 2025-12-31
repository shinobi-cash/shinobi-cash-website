/**
 * Wallet Auth Handler
 * Handles wallet signature request for authentication
 */

"use client";

import { useEffect, useState, useRef } from "react";
import { useSignTypedData, useAccount, useChainId, useConnect } from "wagmi";
import { useAuthActions } from "../../hooks/useAuthStore";
import { AuthErrorCode } from "../../domain/types";
import { parseWalletAccountId } from "../../shared";
import { getEIP712Message } from "../../wallet/eip712";

interface WalletAuthHandlerProps {
  accountId: string;
}

export function WalletAuthHandler({ accountId }: WalletAuthHandlerProps) {
  const { signTypedDataAsync } = useSignTypedData();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { authenticateWithWallet, setError } = useAuthActions();
  const [isConnecting, setIsConnecting] = useState(false);
  const authTriggeredRef = useRef(false);

  // Parse accountId to extract wallet address
  const parsedAccount = parseWalletAccountId(accountId);
  const targetWalletAddress = parsedAccount?.walletAddress;

  useEffect(() => {
    const triggerAuth = async () => {
      // Step 1: Check if wallet is connected
      if (!isConnected || !address) {
        // Prevent multiple connection attempts
        if (authTriggeredRef.current || isConnecting) return;

        authTriggeredRef.current = true;
        setIsConnecting(true);

        try {
          // Try to connect with the first available connector
          const connector = connectors[0];
          if (!connector) {
            throw new Error("No wallet connector available");
          }

          // Await the connection to complete
          await connect({ connector });

          // Connection successful - effect will re-run with isConnected=true
          authTriggeredRef.current = false;
        } catch (error) {
          console.error("Wallet connection failed:", error);
          authTriggeredRef.current = false;
          setIsConnecting(false);
          setError(
            {
              code: AuthErrorCode.WALLET_NOT_CONNECTED,
              message:
                error instanceof Error
                  ? error.message
                  : "Failed to connect wallet. Please try again.",
              timestamp: Date.now(),
              originalError: error,
            },
            () => triggerAuth()
          );
        }
        return;
      }

      // Step 2: Wallet is connected, verify address matches
      // Check if the connected wallet matches the account being authenticated
      if (targetWalletAddress && address.toLowerCase() !== targetWalletAddress.toLowerCase()) {
        setError(
          {
            code: AuthErrorCode.WALLET_NOT_CONNECTED,
            message: `Please connect wallet ${targetWalletAddress}. Currently connected: ${address}`,
            timestamp: Date.now(),
          },
          () => {
            authTriggeredRef.current = false;
            triggerAuth();
          }
        );
        return;
      }

      // Step 3: Trigger signing
      // Prevent multiple signing attempts
      if (authTriggeredRef.current) return;

      authTriggeredRef.current = true;
      setIsConnecting(false);

      try {
        // Deterministic EIP-712 message for wallet authentication
        // CRITICAL: Must be identical every time to derive the same encryption key
        const message = getEIP712Message(address as `0x${string}`, chainId, {
          deterministic: true,
        });

        const signature = await signTypedDataAsync(message);

        await authenticateWithWallet(accountId, signature, address, chainId);
      } catch (error) {
        console.error("Wallet signing failed:", error);
        authTriggeredRef.current = false; // Reset on error to allow retry
        setError(
          {
            code: AuthErrorCode.WALLET_SIGNATURE_FAILED,
            message:
              error instanceof Error ? error.message : "Failed to sign message. Please try again.",
            timestamp: Date.now(),
            originalError: error,
          },
          () => triggerAuth()
        );
      }
    };

    triggerAuth();
  }, [
    accountId,
    address,
    chainId,
    isConnected,
    connectors,
    connect,
    authenticateWithWallet,
    signTypedDataAsync,
    setError,
    isConnecting,
    targetWalletAddress,
  ]);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-orange-500" />
      <h2 className="text-lg font-semibold text-white">
        {isConnecting ? "Connect Wallet" : "Sign Message"}
      </h2>
      <p className="mt-2 text-center text-sm text-gray-400">
        {isConnecting
          ? "Please connect your wallet to continue."
          : "Please sign the message in your wallet to authenticate."}
      </p>
      <p className="mt-1 text-xs text-gray-500">{accountId}</p>
    </div>
  );
}
