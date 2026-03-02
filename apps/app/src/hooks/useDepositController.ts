/**
 * useDepositControllerSnapshot - React adapter for DepositController
 * Thin adapter that syncs React/Wagmi state to controller and returns read-only snapshot
 * Follows Auth pattern: controller is domain-driven, hook is just a React bridge
 */

import { useEffect } from "react";
import { useAccount, useChainId, useBalance, useWalletClient } from "wagmi";
import { useSnapshot } from "valtio";
import { DepositController } from "@/controllers/DepositController";
import { useControllerCleanup } from "@/hooks/useControllerCleanup";
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
  const { data: walletClient } = useWalletClient({ chainId });

  useControllerCleanup(DepositController);

  // Sync wallet context to controller
  useEffect(() => {
    DepositController._updateWallet({
      isConnected,
      address,
      chainId,
      balance: balance?.value ? formatEther(balance.value) : "0",
      walletClient: walletClient,
    });
  }, [isConnected, address, chainId, balance?.value, walletClient]);

  return snapshot;
}
