import type {
  WithdrawalPipelineContext,
  Withdraw2PipelineContext,
  WithdrawalProof,
  Withdraw2Proof,
  PreparedUserOperation,
} from "@/types/withdrawal";
import {
  getCrosschainWithdrawalSmartAccountClient,
  getWithdrawalSmartAccountClient,
  getWithdraw2SmartAccountClient,
  getCrosschainWithdraw2SmartAccountClient,
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

  const { smartAccountClient, gasLimits } = isCrossChain
    ? await getCrosschainWithdrawalSmartAccountClient()
    : await getWithdrawalSmartAccountClient();

  const userOperation = await prepareWithdrawalUserOperation(
    smartAccountClient,
    callData,
    gasLimits
  );

  return { context, proof, userOperation, smartAccountClient, gasLimits };
}

// ============ WITHDRAW2 (2:1) ============

export async function prepareWithdraw2UserOperation(
  context: Withdraw2PipelineContext,
  proof: Withdraw2Proof
): Promise<PreparedUserOperation> {
  const [processooor, data] = context.withdrawalData;
  const withdrawalData = { processooor, data };

  const isCrossChain = context.kind === "cross-chain";

  // Format proof based on withdrawal type (9 signals for same-chain, 14 for cross-chain)
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

  // Use withdraw2-specific smart account clients with the correct paymaster
  const { smartAccountClient, gasLimits } = isCrossChain
    ? await getCrosschainWithdraw2SmartAccountClient()
    : await getWithdraw2SmartAccountClient();

  const userOperation = await prepareWithdrawalUserOperation(
    smartAccountClient,
    callData,
    gasLimits
  );

  return { context, proof, userOperation, smartAccountClient, gasLimits };
}
