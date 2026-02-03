import { formatEther, parseEther } from "viem/utils";
import type { PublicClient, WalletClient } from "viem";
import { estimateContractGas, waitForTransactionReceipt } from "viem/actions";
import { SHINOBI_CASH_ETH_POOL } from "@shinobi-cash/constants";
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  derivePrecommitment,
} from "@shinobi-cash/core/deposit";
import { NotesRepository } from "@/lib/storage/repositories/NotesRepository";
import { TX_RECEIPT_TIMEOUT_MS } from "@/constants/timings";
import {
  notesStorageAdapter,
  sharedEncryptionService,
} from "@/lib/storage/adapters/IndexedDBStore";
import { resolveDepositRoute, buildDepositCallParams } from "@/utils/depositRoute";

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
  },

  async estimateGas(
    amount: string,
    noteData: CashNoteData,
    chainId: number,
    publicClient: PublicClient,
    gasPrice: bigint,
    solverFeeBPS?: number
  ): Promise<GasEstimate> {
    const route = resolveDepositRoute(chainId);
    const callParams = buildDepositCallParams(route, noteData.precommitment, solverFeeBPS);
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
  },

  async submitTransaction(
    amount: string,
    noteData: CashNoteData,
    chainId: number,
    walletClient: WalletClient,
    gasPrice?: bigint,
    solverFeeBPS?: number
  ): Promise<`0x${string}`> {
    const amountWei = parseEther(amount);
    const route = resolveDepositRoute(chainId);
    const callParams = buildDepositCallParams(route, noteData.precommitment, solverFeeBPS);

    // Add 50% buffer to gas price to handle L2 gas fluctuations
    const gasParams = gasPrice
      ? {
          maxFeePerGas: (gasPrice * BigInt(150)) / BigInt(100),
          maxPriorityFeePerGas: (gasPrice * BigInt(150)) / BigInt(100),
        }
      : {};

    const hash = await walletClient.writeContract({
      address: callParams.address,
      abi: callParams.abi,
      functionName: callParams.functionName,
      args: callParams.args,
      value: amountWei,
      chain: walletClient.chain,
      account: walletClient.account!,
      ...gasParams,
    });

    return hash;
  },

  async trackTransaction(
    txHash: `0x${string}`,
    publicClient: PublicClient,
    onStatusChange: (status: TransactionStatus, reason?: string) => void
  ): Promise<void> {
    try {
      const receipt = await waitForTransactionReceipt(publicClient, {
        hash: txHash,
        timeout: TX_RECEIPT_TIMEOUT_MS,
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
