import type {
  WithdrawalPipelineContext,
  WithdrawalProof,
  PreparedUserOperation,
  ExecutionResult,
} from "@/types/withdrawal";
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
} from "@/services/WithdrawalContractService";

export async function prepareUserOperation(
  context: WithdrawalPipelineContext,
  proof: WithdrawalProof
): Promise<PreparedUserOperation> {
  const formattedProof =
    context.kind === "cross-chain"
      ? formatCrossChainProofForContract(proof.proof, proof.publicSignals)
      : formatProofForContract(proof.proof, proof.publicSignals);

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

  const smartAccountClient =
    context.kind === "cross-chain"
      ? await getCrosschainWithdrawalSmartAccountClient()
      : await getWithdrawalSmartAccountClient();

  const userOperation =
    context.kind === "cross-chain"
      ? await prepareCrossChainWithdrawalUserOperation(smartAccountClient, callData)
      : await prepareWithdrawalUserOperation(smartAccountClient, callData);

  return { context, proof, userOperation, smartAccountClient };
}

export async function executeUserOperation(
  preparedUserOp: PreparedUserOperation
): Promise<ExecutionResult> {
  const isCrossChain = preparedUserOp.context.kind === "cross-chain";
  const transactionHash = await executeWithdrawalUserOperation(
    preparedUserOp.smartAccountClient,
    preparedUserOp.userOperation,
    isCrossChain
  );
  return { transactionHash, success: true };
}
