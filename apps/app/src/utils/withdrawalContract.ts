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
  SAME_CHAIN_GAS_LIMITS,
  CROSS_CHAIN_GAS_LIMITS,
} from "@shinobi-cash/constants";
import { pimlicoClient } from "@/lib/clients";
import type { SmartAccountClient } from "permissionless";
import { AppException, Errors, logError } from "@/lib/errors/errors";
import { http, createPublicClient } from "viem";
import { type UserOperation, entryPoint07Address } from "viem/account-abstraction";

// Re-export SDK types and functions for convenience
export type {
  WithdrawalData,
  CrossChainWithdrawalData,
  ContractProof,
  ContractCrossChainProof,
  SnarkJsProof,
} from "@shinobi-cash/core";

export {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  formatProofForContract,
  formatCrossChainProofForContract,
  encodeRelayCallData,
  encodeCrossChainWithdrawalCallData,
} from "@shinobi-cash/core";

export interface SmartAccountConfig {
  privateKey: `0x${string}`;
  bundlerUrl: string;
  paymasterAddress: string;
}

const publicClient = createPublicClient({
  chain: POOL_CHAIN as never,
  transport: http(),
});

export async function fetchPoolScope(): Promise<string> {
  try {
    const scope = (await publicClient.readContract({
      address: SHINOBI_CASH_ETH_POOL.address,
      abi: PoolScopeAbi,
      functionName: "SCOPE",
    })) as bigint;

    const scopeString = scope.toString();
    return scopeString;
  } catch (error) {
    logError(error, { action: "fetchPoolScope" });

    throw new AppException(
      Errors.blockchain.contractError("Failed to fetch pool scope from contract", error)
    );
  }
}

export async function prepareWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  relayCallData: `0x${string}`
) {
  try {
    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }
    const userOperationGasPrice = await pimlicoClient.getUserOperationGasPrice();
    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account,
      calls: [
        {
          to: SHINOBI_CASH_ENTRYPOINT.address,
          data: relayCallData,
          value: BigInt(0),
        },
      ],
      ...userOperationGasPrice.fast,
    });

    return preparedUserOperation;
  } catch (error) {
    logError(error, { action: "prepareWithdrawalUserOperation" });

    throw new AppException(
      Errors.blockchain.contractError("Failed to prepare withdrawal transaction", error)
    );
  }
}

export async function executeWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  userOperation: UserOperation,
  isCrossChain: boolean = false
): Promise<string> {
  try {
    // Use appropriate gas limits based on withdrawal type
    const gasLimits = isCrossChain ? CROSS_CHAIN_GAS_LIMITS : SAME_CHAIN_GAS_LIMITS;

    userOperation.callGasLimit = gasLimits.CALL_GAS_LIMIT;
    userOperation.paymasterVerificationGasLimit = gasLimits.PAYMASTER_VERIFICATION_GAS_LIMIT;

    const signature = await smartAccountClient.account?.signUserOperation(userOperation);
    const userOpHash = await smartAccountClient.sendUserOperation({
      entryPointAddress: entryPoint07Address,
      ...userOperation,
      signature,
    });

    const receipt = await smartAccountClient.waitForUserOperationReceipt({ hash: userOpHash });

    // Verify transaction was successful
    if (!receipt.success) {
      throw new Error("UserOperation execution failed");
    }

    return receipt.receipt.transactionHash;
  } catch (error) {
    logError(error, { action: "executeWithdrawalUserOperation" });

    // Check for common user errors
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("user rejected") || msg.includes("user denied")) {
        throw new AppException(Errors.blockchain.userRejected(error));
      }

      if (msg.includes("insufficient funds")) {
        throw new AppException(Errors.blockchain.insufficientFunds(error));
      }
    }

    throw new AppException(
      Errors.blockchain.transactionFailed("Failed to execute withdrawal transaction", error)
    );
  }
}

export async function prepareCrossChainWithdrawalUserOperation(
  smartAccountClient: SmartAccountClient,
  crossChainCallData: `0x${string}`
) {
  try {
    if (!smartAccountClient.account) {
      throw new Error("Smart account not initialized");
    }
    const userOperationGasPrice = await pimlicoClient.getUserOperationGasPrice();
    const preparedUserOperation = await smartAccountClient.prepareUserOperation({
      account: smartAccountClient.account,
      calls: [
        {
          to: SHINOBI_CASH_ENTRYPOINT.address,
          data: crossChainCallData,
          value: BigInt(0),
        },
      ],
      ...userOperationGasPrice.fast,
    });

    return preparedUserOperation;
  } catch (error) {
    logError(error, { action: "prepareCrossChainWithdrawalUserOperation" });

    throw new AppException(
      Errors.blockchain.contractError("Failed to prepare cross-chain withdrawal transaction", error)
    );
  }
}
