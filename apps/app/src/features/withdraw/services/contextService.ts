/**
 * Context Service
 *
 * Builds withdrawal context with derivations and withdrawal data.
 */

import type { WithdrawalRequest, FeeQuote, WithdrawalPipelineContext } from "../domain/types";
import { validateWithdrawalContext } from "../domain/invariants";
import {
  deriveWithdrawalInputs,
  deriveCrosschainWithdrawalInputs,
} from "@shinobi-cash/core";
import {
  createWithdrawalData,
  createCrossChainWithdrawalData,
  fetchPoolScope,
} from "@/services/blockchain/contractService";
import {
  SHINOBI_CASH_RELAY_WITHDRAWAL_PAYMASTER,
  SHINOBI_CASH_CROSSCHAIN_WITHDRAWAL_PAYMASTER,
} from "@shinobi-cash/constants";

// ============ PUBLIC API ============

/**
 * Build withdrawal context with derivations
 *
 * @param request - Withdrawal request
 * @param feeQuote - Fee quote
 * @returns Withdrawal context
 */
export async function buildWithdrawalContext(
  request: WithdrawalRequest,
  feeQuote: FeeQuote
): Promise<WithdrawalPipelineContext> {
  // 1. Fetch pool scope from contract
  const poolScopeString = await fetchPoolScope();
  const poolScope = BigInt(poolScopeString);

  // 2. Create withdrawal data structure based on type
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

  // 3. Derive context hash and nullifiers
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

  // 4. Create context
  const context: WithdrawalPipelineContext = {
    kind: feeQuote.kind,
    request,
    feeQuote,
    poolScope,
    derivation,
    withdrawalData,
  };

  // 5. Validate before returning
  validateWithdrawalContext(context);

  return context;
}
