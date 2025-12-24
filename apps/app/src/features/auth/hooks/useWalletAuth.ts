/**
 * Wallet Auth Hook
 * Manages wallet signature-based authentication and key generation
 *
 * SECURITY: Uses HKDF-based key derivation with chain binding
 * @file features/auth/hooks/useWalletAuth.ts
 */

import { useState, useCallback } from "react";
import { useAccount, useSignTypedData, useChainId } from "wagmi";
import { getEIP712Message } from "@/utils/eip712";
import {
  generateKeysFromWalletSignature,
  performWalletLogin,
  setupWalletAccount,
  deriveEncryptionKey,
} from "../protocol";
import type { KeyGenerationResult } from "@shinobi-cash/core";
import type { AuthError } from "../types";
import { normalizeAuthError } from "../types";

interface WalletAuthState {
  isProcessing: boolean;
  error: AuthError;
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
   *
   * SECURITY: Uses HKDF with chain binding
   */
  const generateKeys = useCallback(async (): Promise<KeyGenerationData | null> => {
    if (!address) {
      setState({ isProcessing: false, error: normalizeAuthError("No wallet connected", "wallet") });
      return null;
    }

    setState({ isProcessing: true, error: null });

    try {
      // Get user to sign EIP-712 message
      const message = getEIP712Message(address, chainId);
      const signature = await signTypedDataAsync(message);

      // SECURITY: Generate keys using HKDF with chain binding
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
      setState({ isProcessing: false, error: normalizeAuthError(error, "wallet") });
      return null;
    }
  }, [address, chainId, signTypedDataAsync]);

  /**
   * Login with wallet signature
   * Returns keys if account exists, null if new account
   *
   * SECURITY: Uses HKDF with chain binding
   */
  const login = useCallback(async (): Promise<KeyGenerationResult | null> => {
    if (!address) {
      setState({ isProcessing: false, error: normalizeAuthError("No wallet connected", "wallet") });
      return null;
    }

    setState({ isProcessing: true, error: null });

    try {
      // Get user to sign EIP-712 message
      const message = getEIP712Message(address, chainId);
      const signature = await signTypedDataAsync(message);

      // SECURITY: Login with chain-bound account
      const keys = await performWalletLogin(signature, address, chainId);

      setState({ isProcessing: false, error: null });
      return keys; // null if new account, keys if existing
    } catch (error) {
      console.error("Wallet login failed:", error);
      setState({ isProcessing: false, error: normalizeAuthError(error, "wallet") });
      return null;
    }
  }, [address, chainId, signTypedDataAsync]);

  /**
   * Setup wallet-only account (no passkey)
   *
   * SECURITY: Uses HKDF with chain binding
   */
  const setupAccount = useCallback(
    async (
      walletAddress: string,
      signature: string,
      generatedKeys: KeyGenerationResult
    ): Promise<boolean> => {
      setState({ isProcessing: true, error: null });

      try {
        // SECURITY: Setup with chain-bound account
        await setupWalletAccount(walletAddress, signature, chainId, generatedKeys);
        setState({ isProcessing: false, error: null });
        return true;
      } catch (error) {
        console.error("Wallet account setup failed:", error);
        setState({ isProcessing: false, error: normalizeAuthError(error, "wallet") });
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
