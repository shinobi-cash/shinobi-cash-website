/**
 * Wallet Auth Hook
 * file: src/features/auth/wallet/useWallet.ts
 * Manages wallet signature-based authentication and key generation.
 * Uses HKDF-based key derivation with chain binding for security.
 */

import { useState, useCallback } from "react";
import { useAccount, useSignTypedData, useChainId } from "wagmi";
import { getEIP712Message } from "./eip712";
import { generateKeysFromWalletSignature } from "../shared";
import {
  performWalletLogin,
  setupWalletAccount,
  deriveEncryptionKey,
} from "./walletAuth";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import { AuthError, AuthErrorCode } from "@/lib/errors/AuthError";

interface WalletAuthState {
  isProcessing: boolean;
  error: AuthError | null;
}

interface KeyGenerationData {
  keys: KeyGenerationResult;
  encryptionKey: Uint8Array;
  walletAddress: string;
}

export function useWalletAuth() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { signTypedDataAsync } = useSignTypedData();

  const [state, setState] = useState<WalletAuthState>({
    isProcessing: false,
    error: null,
  });

  /**
   * Generate keys from wallet signature
   * Returns keys + encryption data for new accounts
   */
  const generateKeys = useCallback(async (): Promise<KeyGenerationData | null> => {
    if (!address) {
      setState({
        isProcessing: false,
        error: new AuthError(AuthErrorCode.INVALID_CREDENTIALS, "No wallet connected")
      });
      return null;
    }

    setState({ isProcessing: true, error: null });

    try {
      const message = getEIP712Message(address, chainId, {
        deterministic: true,
      });
      const signature = await signTypedDataAsync(message);

      const keys = await generateKeysFromWalletSignature(signature, chainId, address);
      const encryptionKey = await deriveEncryptionKey(signature, chainId, address);

      setState({ isProcessing: false, error: null });

      return {
        keys,
        encryptionKey,
        walletAddress: address,
      };
    } catch (error) {
      console.error("Key generation failed:", error);

      const authError = error instanceof AuthError
        ? error
        : new AuthError(AuthErrorCode.UNKNOWN, "Key generation failed. Please try again.");

      setState({ isProcessing: false, error: authError });
      return null;
    }
  }, [address, chainId, signTypedDataAsync]);

  /**
   * Login with wallet signature
   * Returns keys if account exists, null if new account
   */
  const login = useCallback(async (): Promise<KeyGenerationResult | null> => {
    if (!address) {
      setState({
        isProcessing: false,
        error: new AuthError(AuthErrorCode.INVALID_CREDENTIALS, "No wallet connected")
      });
      return null;
    }

    setState({ isProcessing: true, error: null });

    try {
      const message = getEIP712Message(address, chainId, {
        deterministic: true,
      });
      const signature = await signTypedDataAsync(message);

      const keys = await performWalletLogin(signature, address, chainId);

      setState({ isProcessing: false, error: null });
      return keys; // null if new account, keys if existing
    } catch (error) {
      console.error("Wallet login failed:", error);

      const authError = error instanceof AuthError
        ? error
        : new AuthError(AuthErrorCode.UNKNOWN, "Wallet login failed. Please try again.");

      setState({ isProcessing: false, error: authError });
      return null;
    }
  }, [address, chainId, signTypedDataAsync]);

  /**
   * Setup wallet-only account (no passkey)
   */
  const setupAccount = useCallback(
    async (
      walletAddress: string,
      signature: string,
      generatedKeys: KeyGenerationResult
    ): Promise<boolean> => {
      setState({ isProcessing: true, error: null });

      try {
        await setupWalletAccount(walletAddress, signature, chainId, generatedKeys);
        setState({ isProcessing: false, error: null });
        return true;
      } catch (error) {
        console.error("Wallet account setup failed:", error);

        const authError = error instanceof AuthError
          ? error
          : new AuthError(AuthErrorCode.UNKNOWN, "Wallet account setup failed. Please try again.");

        setState({ isProcessing: false, error: authError });
        return false;
      }
    },
    [chainId]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  return {
    isProcessing: state.isProcessing,
    error: state.error,
    isWalletConnected: !!address,
    generateKeys,
    login,
    setupAccount,
    clearError,
  };
}
