import { WithdrawalKind, WithdrawalRequest } from "@/types/withdrawal";

export function classifyWithdrawal(
  request: WithdrawalRequest,
  poolChainId: number
): WithdrawalKind {
  return request.destinationChainId && request.destinationChainId !== poolChainId
    ? "cross-chain"
    : "same-chain";
}

export function calculateFeesFromBPS(
  withdrawAmountWei: bigint,
  relayFeeBPS: number,
  solverFeeBPS: number
): {
  executionFeeWei: bigint;
  solverFeeWei: bigint;
  totalFeeWei: bigint;
} {
  const executionFeeWei = (withdrawAmountWei * BigInt(relayFeeBPS)) / BigInt(10000);
  const solverFeeWei = (withdrawAmountWei * BigInt(solverFeeBPS)) / BigInt(10000);
  const totalFeeWei = executionFeeWei + solverFeeWei;

  return { executionFeeWei, solverFeeWei, totalFeeWei };
}
