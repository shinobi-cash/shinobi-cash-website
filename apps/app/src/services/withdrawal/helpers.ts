/**
 * Withdrawal Helper Functions
 */

import { isAddress } from "viem";
import { WITHDRAWAL_FEES } from "@shinobi-cash/constants";
import { POOL_CHAIN_ID } from "@/config/chains";
import type { WithdrawalRequest } from "./types";
import type { Note } from "@/lib/storage/types";
import {
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveDepositNullifier,
  deriveDepositSecret,
} from "@shinobi-cash/core";

// ============ VALIDATION ============

/**
 * Validate withdrawal request
 */
export function validateWithdrawalRequest(request: WithdrawalRequest): void {
  const { note, withdrawAmount, recipientAddress, accountKey } = request;

  if (!note) {
    throw new Error("Invalid note data");
  }

  if (!withdrawAmount || Number.parseFloat(withdrawAmount) <= 0) {
    throw new Error("Invalid withdrawal amount");
  }

  if (Number.parseFloat(withdrawAmount) > Number.parseFloat(note.amount)) {
    throw new Error("Withdrawal amount exceeds note balance");
  }

  if (!recipientAddress || !isAddress(recipientAddress)) {
    throw new Error("Invalid recipient address");
  }

  if (!accountKey) {
    throw new Error("No account keys provided");
  }
}

// ============ CALCULATIONS ============

/**
 * Calculate withdrawal fees and amounts
 * withdrawAmount: Total amount being withdrawn from note
 * executionFee (relay fee): Maximum fee taken from withdrawal amount (withdrawAmount * relayFeeBPS / 10000)
 * solverFee: Fee for cross-chain solver (withdrawAmount * solverFeeBPS / 10000) - only for cross-chain
 * youReceive: What user actually receives (withdrawAmount - executionFee - solverFee)
 * remainingInNote: What's left in the note (noteBalance - withdrawAmount)
 */
export function calculateWithdrawalAmounts(withdrawAmount: string, destinationChainId?: number) {
  const withdrawAmountNum = Number.parseFloat(withdrawAmount);
  // const relayFeeBPS = Number(WITHDRAWAL_FEES.DEFAULT_RELAY_FEE_BPS);
  const relayFeeBPS = Number(500);
  const solverFeeBPS = Number(WITHDRAWAL_FEES.DEFAULT_SOLVER_FEE_BPS);

  // Check if this is a cross-chain withdrawal
  const isCrossChain = destinationChainId && destinationChainId !== POOL_CHAIN_ID;

  // Relay fee (execution fee) = withdrawAmount * relayFeeBPS / 10000 (basis points to decimal)
  const executionFee = (withdrawAmountNum * relayFeeBPS) / 10000;

  // Solver fee only applies to cross-chain withdrawals
  const solverFee = isCrossChain ? (withdrawAmountNum * solverFeeBPS) / 10000 : 0;

  // User receives withdrawal amount minus all fees
  const youReceive = withdrawAmountNum - executionFee - solverFee;

  return {
    withdrawAmount: withdrawAmountNum,
    executionFee,
    solverFee,
    youReceive,
    relayFeeBPS,
    solverFeeBPS,
    isCrossChain: !!isCrossChain,
  };
}

// ============ NULLIFIER DERIVATION ============

/**
 * Derive existing nullifier and secret from note
 * Handles both deposit notes (changeIndex = 0) and change notes
 */
export function deriveExistingNullifierAndSecret(
  accountKey: bigint,
  note: Note
): { existingNullifier: bigint; existingSecret: bigint } {
  if (note.changeIndex === 0) {
    // Deposit note
    return {
      existingNullifier: deriveDepositNullifier(accountKey, note.poolAddress, note.depositIndex),
      existingSecret: deriveDepositSecret(accountKey, note.poolAddress, note.depositIndex),
    };
  }
  // Change note
  return {
    existingNullifier: deriveChangeNullifier(
      accountKey,
      note.poolAddress,
      note.depositIndex,
      note.changeIndex
    ),
    existingSecret: deriveChangeSecret(
      accountKey,
      note.poolAddress,
      note.depositIndex,
      note.changeIndex
    ),
  };
}
