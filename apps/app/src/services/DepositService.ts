/**
 * Deposit Service - Pure business logic (no React)
 * Extracted from hooks to be used by both DepositController and React adapters
 */

import { formatEther, parseEther, type PublicClient, type WalletClient } from "viem";
import { estimateContractGas, waitForTransactionReceipt } from "viem/actions";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  derivePrecommitment,
} from "@shinobi-cash/core";
import { NotesRepository } from "@/lib/storage/repositories/NotesRepository";
import {
  notesStorageAdapter,
  sharedEncryptionService,
} from "@/lib/storage/adapters/IndexedDBStore";
import { resolveDepositRoute, buildDepositCallParams } from "@/utils/depositRoute";
import { getUserMessage, logError } from "@/lib/errors";

const GAS_BUFFER = BigInt(120); // 20% buffer for safety
const DIVISOR = BigInt(100);

/**
 * Commitment note data structure
 */
export interface CashNoteData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  precommitment: bigint;
}

/**
 * Gas estimation result
 */
export interface GasEstimate {
  gasCostEth: string;
  gasCostWei: bigint;
  gasLimit: bigint;
}

/**
 * Transaction tracking status
 */
export type TransactionStatus = "confirming" | "confirmed" | "failed";

/**
 * Pure deposit service (no React dependencies)
 */
export const depositService = {
  /**
   * Generate deposit commitment
   * Composes crypto primitives + storage (no repository wrapper needed)
   *
   * @param accountKey - User's account key
   * @param publicKey - User's public key
   * @param lastUsedIndex - Last used deposit index (from controller or -1 if none)
   * @returns Commitment note data
   * @throws Error if generation fails
   */
  async generateCommitment(
    accountKey: bigint,
    publicKey: string,
    lastUsedIndex: number
  ): Promise<CashNoteData> {
    try {
      const poolAddress = SHINOBI_CASH_ETH_POOL.address;

      // 1. Calculate next deposit index
      // If lastUsedIndex provided by controller, use it
      // Otherwise fallback to storage (cold start scenario)
      let depositIndex = 0;

      if (lastUsedIndex >= 0) {
        // Controller has notes, use provided index
        depositIndex = lastUsedIndex + 1;
      } else {
        // Fallback: read from storage directly (cold start)
        const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
        const cached = await notesRepo.getCachedNotes(publicKey, poolAddress);
        depositIndex = cached?.lastUsedIndex !== undefined ? cached.lastUsedIndex + 1 : 0;
      }

      // 2. Compose core crypto primitives directly (no repository wrapper)
      const nullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
      const secret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
      const precommitment = derivePrecommitment(nullifier, secret);

      // 3. Return structured result for deposit transaction
      return {
        poolAddress,
        depositIndex,
        changeIndex: 0, // Deposits always have changeIndex 0
        precommitment: BigInt(precommitment),
      };
    } catch (error) {
      logError(error, {
        action: "generateCommitment",
        component: "depositService",
        hasAccountKey: !!accountKey,
        hasPublicKey: !!publicKey,
      });

      throw new Error(getUserMessage(error, "Failed to generate deposit commitment"));
    }
  },

  /**
   * Estimate gas for deposit transaction
   * Extracted from useDepositGasEstimate
   *
   * @param amount - Deposit amount in ETH (string)
   * @param noteData - Commitment note data
   * @param chainId - Chain ID for the deposit
   * @param publicClient - Viem public client
   * @param gasPrice - Current gas price
   * @returns Gas estimate with cost in ETH and wei
   * @throws Error if estimation fails
   */
  async estimateGas(
    amount: string,
    noteData: CashNoteData,
    chainId: number,
    publicClient: PublicClient,
    gasPrice: bigint
  ): Promise<GasEstimate> {
    try {
      const route = resolveDepositRoute(chainId);
      const callParams = buildDepositCallParams(route, noteData.precommitment);
      const valueWei = parseEther(amount);

      const gasLimit = await estimateContractGas(publicClient, {
        address: callParams.address,
        abi: callParams.abi,
        functionName: callParams.functionName,
        args: callParams.args,
        value: valueWei,
      } as never); // Type assertion needed due to viem's complex type inference

      // Apply buffer and calculate cost
      const bufferedGas = (gasLimit * GAS_BUFFER) / DIVISOR;
      const totalWei = bufferedGas * gasPrice;

      return {
        gasCostEth: formatEther(totalWei),
        gasCostWei: totalWei,
        gasLimit: bufferedGas,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Gas estimation failed - check balance";

      throw new Error(errorMessage);
    }
  },

  /**
   * Submit deposit transaction
   * Extracted from useDepositTransaction
   *
   * @param amount - Deposit amount in ETH (string)
   * @param noteData - Commitment note data
   * @param chainId - Chain ID for the deposit
   * @param walletClient - Viem wallet client
   * @returns Transaction hash
   * @throws Error if submission fails
   */
  async submitTransaction(
    amount: string,
    noteData: CashNoteData,
    chainId: number,
    walletClient: WalletClient
  ): Promise<`0x${string}`> {
    try {
      const amountWei = parseEther(amount);
      const route = resolveDepositRoute(chainId);
      const callParams = buildDepositCallParams(route, noteData.precommitment);

      const hash = await walletClient.writeContract({
        address: callParams.address,
        abi: callParams.abi,
        functionName: callParams.functionName,
        args: callParams.args,
        value: amountWei,
        chain: walletClient.chain,
        account: walletClient.account!,
      });

      return hash;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to submit transaction";

      throw new Error(errorMessage);
    }
  },

  /**
   * Track transaction status until confirmed or failed
   * Uses explicit status updates via callback
   *
   * @param txHash - Transaction hash to track
   * @param publicClient - Viem public client
   * @param onStatusChange - Callback for status updates
   */
  async trackTransaction(
    txHash: `0x${string}`,
    publicClient: PublicClient,
    onStatusChange: (status: TransactionStatus, reason?: string) => void
  ): Promise<void> {
    try {
      // Wait for transaction receipt (throws on timeout)
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash: txHash,
        timeout: 60_000, // 60 seconds
      });

      // Check if transaction succeeded
      if (receipt.status === "success") {
        onStatusChange("confirmed");
      } else {
        onStatusChange("failed", "Transaction reverted");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transaction tracking failed";

      onStatusChange("failed", errorMessage);
    }
  },
};
