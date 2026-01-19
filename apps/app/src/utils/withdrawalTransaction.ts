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
} from "@/utils/withdrawalContract";

export async function prepareUserOperation(
  context: WithdrawalPipelineContext,
  proof: WithdrawalProof
): Promise<PreparedUserOperation> {
  const withdrawalData = {
    processooor: context.withdrawalData[0],
    data: context.withdrawalData[1],
  };

  const isCrossChain = context.kind === "cross-chain";

  const callData = isCrossChain
    ? encodeCrossChainWithdrawalCallData(
        withdrawalData,
        formatCrossChainProofForContract(proof.proof, proof.publicSignals),
        context.poolScope
      )
    : encodeRelayCallData(
        withdrawalData,
        formatProofForContract(proof.proof, proof.publicSignals),
        context.poolScope
      );

  const smartAccountClient = isCrossChain
    ? await getCrosschainWithdrawalSmartAccountClient()
    : await getWithdrawalSmartAccountClient();

  const userOperation = isCrossChain
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
