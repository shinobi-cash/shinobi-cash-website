import type {
  WithdrawalPipelineContext,
  Withdraw2PipelineContext,
  WithdrawalProof,
  Withdraw2Proof,
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
  formatWithdraw2SameChainProofForContract,
  formatWithdraw2CrossChainProofForContract,
  encodeRelayCallData,
  encodeCrossChainWithdrawalCallData,
  encodeWithdraw2RelayCallData,
  encodeCrossChainWithdraw2CallData,
  prepareWithdrawalUserOperation,
  prepareCrossChainWithdrawalUserOperation,
  executeWithdrawalUserOperation,
} from "@/utils/withdrawalContract";

export async function prepareUserOperation(
  context: WithdrawalPipelineContext,
  proof: WithdrawalProof
): Promise<PreparedUserOperation> {
  const [processooor, data] = context.withdrawalData;
  const withdrawalData = { processooor, data };

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

// ============ WITHDRAW2 (2:1) ============

export async function prepareWithdraw2UserOperation(
  context: Withdraw2PipelineContext,
  proof: Withdraw2Proof
): Promise<PreparedUserOperation> {
  const [processooor, data] = context.withdrawalData;
  const withdrawalData = { processooor, data };

  const isCrossChain = context.kind === "cross-chain";

  // Format proof based on withdrawal type (9 signals for same-chain, 10 for cross-chain)
  const callData = isCrossChain
    ? encodeCrossChainWithdraw2CallData(
        withdrawalData,
        formatWithdraw2CrossChainProofForContract(proof.proof, proof.publicSignals),
        context.poolScope
      )
    : encodeWithdraw2RelayCallData(
        withdrawalData,
        formatWithdraw2SameChainProofForContract(proof.proof, proof.publicSignals),
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
