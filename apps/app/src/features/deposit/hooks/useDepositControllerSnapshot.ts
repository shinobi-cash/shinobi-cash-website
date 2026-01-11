/**
 * useDepositControllerSnapshot - React adapter for DepositController
 * Thin adapter that syncs React/Wagmi state to controller and returns read-only snapshot
 * Follows Auth pattern: controller is domain-driven, hook is just a React bridge
 */

import { useEffect } from "react";
import { useAccount, useChainId, useBalance, useConfig, useGasPrice, useWalletClient } from "wagmi";
import { useSnapshot } from "valtio";
import { DepositController } from "../controllers/DepositController";
import { useCryptoContext } from "@/hooks/useCryptoContext";
import { formatEther } from "viem";

/**
 * Read-only snapshot of DepositController state
 * Syncs wallet and crypto contexts from React to controller
 *
 * This hook:
 * - Does NOT contain business logic
 * - Does NOT orchestrate flows
 * - Only bridges React state → controller
 *
 * @returns Read-only snapshot from DepositController
 */
export function useDepositControllerSnapshot() {
  const snapshot = useSnapshot(DepositController.state);

  // Wallet context (from Wagmi)
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: gasPrice } = useGasPrice({ chainId });
  const config = useConfig();
  const { data: walletClient } = useWalletClient({ chainId });

  // Crypto context (from AccountService via useCryptoContext)
  const { publicKey, accountKey, cryptoReady } = useCryptoContext();
  // Sync wallet context to controller
  useEffect(() => {
    const publicClient = config.getClient({ chainId }) as any; // wagmi client is compatible with viem PublicClient

    DepositController._updateWallet({
      isConnected,
      address,
      chainId,
      balance: balance?.value ? formatEther(balance.value) : "0",
      publicClient,
      walletClient: walletClient, // wagmi wallet client is compatible with viem WalletClient
      gasPrice: gasPrice ?? undefined,
    });
  }, [
    isConnected,
    address,
    chainId,
    balance?.value, // Explicit: only re-run if value changes
    gasPrice,
    config,
    walletClient,
  ]);

  // Sync crypto context to controller
  useEffect(() => {
    DepositController._updateCrypto({
      publicKey,
      accountKey,
      cryptoReady,
    });
  }, [publicKey, accountKey, cryptoReady]);

  return snapshot;
}
