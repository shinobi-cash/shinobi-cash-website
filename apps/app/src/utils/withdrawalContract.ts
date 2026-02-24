/**
 * Withdrawal Contract Utilities
 *
 * App-specific utilities for withdrawal transactions.
 * Pure encoding functions are in @shinobi-cash/core.
 */

import {
  PoolScopeAbi,
  POOL_CHAIN,
  SHINOBI_CASH_ETH_POOL,
  SHINOBI_CASH_ENTRYPOINT,
} from "@shinobi-cash/constants";
import { getViemChain } from "@/config/chains";
import { pimlicoClient, type GasLimits } from "@/lib/clients";
import type { SmartAccountClient } from "permissionless";
import { Errors, logError } from "@/lib/errors/errors";
import { http, createPublicClient } from "viem";
import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";

// Re-export SDK types and functions for convenience
export type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  ContractWithdraw2SameChainProof,
  ContractCrosschainWithdraw2Proof,
  SnarkJsProof,
} from "@shinobi-cash/core/withdrawal";

export {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  formatProofForContract,
  formatCrossChainProofForContract,
  formatWithdraw2SameChainProofForContract,
  formatWithdraw2CrossChainProofForContract,
  encodeRelayCallData,
  encodeCrossChainWithdrawalCallData,
  encodeWithdraw2RelayCallData,
  encodeCrossChainWithdraw2CallData,
} from "@shinobi-cash/core/withdrawal";

export interface SmartAccountConfig {
  privateKey: `0x${string}`;
  bundlerUrl: string;
  paymasterAddress: string;
}

const publicClient = createPublicClient({
  chain: getViemChain(POOL_CHAIN.id),
  transport: http(),
});

export async function fetchPoolScope(): Promise<string> {
  try {
    const scope = (await publicClient.readContract({
      address: SHINOBI_CASH_ETH_POOL.address as `0x${string}`,
      abi: PoolScopeAbi,
      functionName: "SCOPE",
    })) as bigint;

    const scopeString = scope.toString();
    return scopeString;
  } catch (error) {
    logError(error, { action: "fetchPoolScope" });
    throw Errors.blockchain.contractError("Failed to fetch pool scope from contract", error);
  }
}

/**
 * Prepare a withdrawal UserOperation with fixed gas limits.
 * Uses hardcoded gas limits to avoid bundler estimation which can cause
 * paymaster validation failures due to gas cost mismatches.
 */
export async function prepareWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  callData: `0x${string}`,
  gasLimits: GasLimits,
  targetAddress: `0x${string}` = SHINOBI_CASH_ENTRYPOINT.address as `0x${string}`
): Promise<UserOperation<"0.7">> {
  try {
    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }

    const gasPrices = await pimlicoClient.getUserOperationGasPrice();

    // Prepare UserOperation with fixed gas limits to skip bundler estimation
    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account,
      calls: [
        {
          to: targetAddress,
          data: callData,
          value: BigInt(0),
        },
      ],
      // Fixed gas limits - prevents bundler from estimating (which triggers paymaster validation)
      callGasLimit: gasLimits.CALL_GAS_LIMIT,
      verificationGasLimit: gasLimits.VERIFICATION_GAS_LIMIT,
      preVerificationGas: gasLimits.PRE_VERIFICATION_GAS,
      // Gas prices from bundler
      ...gasPrices.fast,
    });

    return preparedUserOperation;
  } catch (error) {
    logError(error, { action: "prepareWithdrawalUserOperation" });
    throw Errors.blockchain.contractError("Failed to prepare withdrawal transaction", error);
  }
}

/**
 * Execute a prepared withdrawal UserOperation.
 * Gas limits are already set during preparation.
 */
export async function executeWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  userOperation: UserOperation,
  gasLimits: GasLimits
): Promise<string> {
  try {
    // Ensure gas limits are set (they should already be from preparation)
    userOperation.callGasLimit = gasLimits.CALL_GAS_LIMIT;
    userOperation.verificationGasLimit = gasLimits.VERIFICATION_GAS_LIMIT;
    userOperation.preVerificationGas = gasLimits.PRE_VERIFICATION_GAS;
    userOperation.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;
    userOperation.paymasterPostOpGasLimit = gasLimits.POST_OP_GAS_LIMIT;

    const signature = await smartAccountClient.account?.signUserOperation(userOperation);
    const userOpHash = await smartAccountClient.sendUserOperation({
      entryPointAddress: entryPoint07Address,
      ...userOperation,
      signature,
    });

    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

    if (!receipt.success) {
      throw new Error(`UserOperation execution failed: ${receipt.reason || "unknown reason"}`);
    }

    return receipt.receipt.transactionHash;
  } catch (error) {
    logError(error, { action: "executeWithdrawalUserOperation" });

    // Check for common user errors
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("user rejected") || msg.includes("user denied")) {
        throw Errors.blockchain.userRejected(error);
      }

      if (msg.includes("insufficient funds")) {
        throw Errors.blockchain.insufficientFunds(error);
      }
    }

    throw Errors.blockchain.transactionFailed("Failed to execute withdrawal transaction", error);
  }
}
