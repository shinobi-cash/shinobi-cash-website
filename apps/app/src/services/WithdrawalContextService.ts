import type { WithdrawalRequest, FeeQuote, WithdrawalPipelineContext } from "@/types/withdrawal";
import { validateWithdrawalContext } from "@/utils/withdrawalInvariants";
import { deriveWithdrawalInputs, deriveCrosschainWithdrawalInputs } from "@shinobi-cash/core";
import {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  fetchPoolScope,
} from "@/services/WithdrawalContractService";
import {
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
} from "@shinobi-cash/constants";

export async function buildWithdrawalContext(
  request: WithdrawalRequest,
  feeQuote: FeeQuote
): Promise<WithdrawalPipelineContext> {
  const poolScopeString = await fetchPoolScope();
  const poolScope = BigInt(poolScopeString);

  const withdrawalData =
    feeQuote.kind === "cross-chain"
      ? createCrossChainWithdrawalData(
          request.recipient,
          request.destinationChainId!,
          SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER.address,
          BigInt(feeQuote.relayFeeBPS),
          BigInt(feeQuote.solverFeeBPS)
        )
      : createWithdrawalData(
          request.recipient,
          SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER.address,
          BigInt(feeQuote.relayFeeBPS)
        );

  const derivation =
    feeQuote.kind === "cross-chain"
      ? deriveCrosschainWithdrawalInputs(
          request.note,
          request.accountKey,
          request.note.poolAddress,
          poolScope,
          withdrawalData
        )
      : deriveWithdrawalInputs(
          request.note,
          request.accountKey,
          request.note.poolAddress,
          poolScope,
          withdrawalData
        );

  const context: WithdrawalPipelineContext = {
    kind: feeQuote.kind,
    request,
    feeQuote,
    poolScope,
    derivation,
    withdrawalData,
  };

  validateWithdrawalContext(context);
  return context;
}
