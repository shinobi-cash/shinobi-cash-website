/**
 * useDepositControllerSnapshot - React adapter for DepositController
 * Thin adapter that syncs React/Wagmi state to controller and returns read-only snapshot
 * Follows Auth pattern: controller is domain-driven, hook is just a React bridge
 */

import { useEffect } from "react";
import { useAccount, useChainId, useBalance, useConfig, useGasPrice, useWalletClient } from "wagmi";
import { useSnapshot } from "valtio";
import { DepositController } from "@/controllers/DepositController";
import { formatEther } from "viem/utils";

/**
 * Read-only snapshot of DepositController state
 * Syncs wallet context from React to controller
 * Crypto context is read directly from AuthController by the controller
 *
 * This hook:
 * - Does NOT contain business logic
 * - Does NOT orchestrate flows
 * - Only bridges React state → controller
 *
 * @returns Read-only snapshot from DepositController
 */
export function useDepositController() {
  const snapshot = useSnapshot(DepositController.state);

  // Wallet context (from Wagmi)
  const { isConnected, address } = useAccount();
  const chainId = useChainId();
  const { data: balance } = useBalance({ address });
  const { data: gasPrice } = useGasPrice({ chainId });
  const config = useConfig();
  const { data: walletClient } = useWalletClient({ chainId });

  // Reset controller on unmount (navigation away) — skip if transaction in flight
  useEffect(() => {
    return () => {
      const { status } = DepositController.state.state;
      if (status !== "submitting" && status !== "confirming") {
        DepositController.reset();
      }
    };
  }, []);

  // Sync wallet context to controller
  useEffect(() => {
    // wagmi client is compatible with viem PublicClient
    const publicClient = config.getClient({ chainId }) as unknown as Parameters<
      typeof DepositController._updateWallet
    >[0]["publicClient"];

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

  return snapshot;
}
