/**
 * Transaction Service
 *
 * Prepares and executes UserOperations for withdrawals.
 */

import type {
  WithdrawalPipelineContext,
  WithdrawalProof,
  PreparedUserOperation,
  ExecutionResult,
} from "../domain/types";
import {
  getCrosschainWithdrawalSmartAccountClient,
  getWithdrawalSmartAccountClient,
} from "@/lib/clients";
import {
  formatProofForContract,
  formatCrossChainProofForContract,
  encodeRelayCallData,
  encodeCrossChainWithdrawalCallData,
  prepareWithdrawalUserOperation,
  prepareCrossChainWithdrawalUserOperation,
  executeWithdrawalUserOperation,
  type WithdrawalData,
  type CrossChainWithdrawalData,
} from "@/features/withdraw/services/contractService";

// ============ USEROP PREPARATION ============

/**
 * Prepare UserOperation for withdrawal
 *
 * @param context - Withdrawal context
 * @param proof - Generated ZK proof
 * @returns Prepared UserOperation ready for execution
 */
export async function prepareUserOperation(
  context: WithdrawalPipelineContext,
  proof: WithdrawalProof
): Promise<PreparedUserOperation> {
  // 1. Format proof for contract
  const formattedProof =
    context.kind === "cross-chain"
      ? formatCrossChainProofForContract(proof.proof, proof.publicSignals)
      : formatProofForContract(proof.proof, proof.publicSignals);

  // 2. Create withdrawal data structure
  const withdrawalStruct =
    context.kind === "cross-chain"
      ? ({
          processooor: context.withdrawalData[0] as `0x${string}`,
          data: context.withdrawalData[1] as `0x${string}`,
        } as CrossChainWithdrawalData)
      : ({
          processooor: context.withdrawalData[0] as `0x${string}`,
          data: context.withdrawalData[1] as `0x${string}`,
        } as WithdrawalData);

  // 3. Encode call data
  const callData =
    context.kind === "cross-chain"
      ? encodeCrossChainWithdrawalCallData(
          withdrawalStruct as CrossChainWithdrawalData,
          formattedProof as any,
          context.poolScope
        )
      : encodeRelayCallData(
          withdrawalStruct as WithdrawalData,
          formattedProof as any,
          context.poolScope
        );

  // 4. Get smart account client
  const smartAccountClient =
    context.kind === "cross-chain"
      ? await getCrosschainWithdrawalSmartAccountClient()
      : await getWithdrawalSmartAccountClient();

  // 5. Prepare UserOperation
  const userOperation =
    context.kind === "cross-chain"
      ? await prepareCrossChainWithdrawalUserOperation(smartAccountClient, callData)
      : await prepareWithdrawalUserOperation(smartAccountClient, callData);

  // 6. Return prepared UserOp artifact
  return {
    context,
    proof,
    userOperation,
    smartAccountClient,
  };
}

// ============ USEROP EXECUTION ============

/**
 * Execute prepared UserOperation
 *
 * @param preparedUserOp - Prepared UserOperation
 * @returns Execution result with transaction hash
 */
export async function executeUserOperation(
  preparedUserOp: PreparedUserOperation
): Promise<ExecutionResult> {
  const isCrossChain = preparedUserOp.context.kind === "cross-chain";

  const transactionHash = await executeWithdrawalUserOperation(
    preparedUserOp.smartAccountClient,
    preparedUserOp.userOperation,
    isCrossChain
  );

  return {
    transactionHash,
    success: true,
  };
}
