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
import { getUserMessage, logError } from "@/lib/errors/errors";

const GAS_BUFFER = BigInt(120);
const DIVISOR = BigInt(100);

export interface CashNoteData {
  poolAddress: string;
  depositIndex: number;
  changeIndex: number;
  precommitment: bigint;
}

export interface GasEstimate {
  gasCostEth: string;
  gasCostWei: bigint;
  gasLimit: bigint;
}

export type TransactionStatus = "confirming" | "confirmed" | "failed";

export const depositService = {
  async generateCommitment(
    accountKey: bigint,
    publicKey: string,
    lastUsedIndex: number
  ): Promise<CashNoteData> {
    try {
      const poolAddress = SHINOBI_CASH_ETH_POOL.address;
      let depositIndex = 0;

      if (lastUsedIndex >= 0) {
        depositIndex = lastUsedIndex + 1;
      } else {
        const notesRepo = new NotesRepository(notesStorageAdapter, sharedEncryptionService);
        const cached = await notesRepo.getCachedNotes(publicKey, poolAddress);
        depositIndex = cached?.lastUsedIndex !== undefined ? cached.lastUsedIndex + 1 : 0;
      }

      const nullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
      const secret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
      const precommitment = derivePrecommitment(nullifier, secret);

      return {
        poolAddress,
        depositIndex,
        changeIndex: 0,
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
      } as never);

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

  async trackTransaction(
    txHash: `0x${string}`,
    publicClient: PublicClient,
    onStatusChange: (status: TransactionStatus, reason?: string) => void
  ): Promise<void> {
    try {
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash: txHash,
        timeout: 60_000,
      });

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
