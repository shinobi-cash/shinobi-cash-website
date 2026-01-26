/**
 * Withdrawal Derivation Primitives
 *
 * Pure functions for deriving withdrawal parameters.
 * No I/O, no circuit knowledge, no Merkle trees.
 * Only BigInt in / BigInt out.
 *
 * These functions are circuit-compatible and deterministic.
 */

import { encodeAbiParameters, keccak256 } from 'viem/utils';
import { poseidon3 } from 'poseidon-lite/poseidon3';
import type { Note, DepositNote, ChangeNote } from '../types/Note.js';
import type { CommitmentHash, NullifierHash, PrecommitmentHash } from '../types/Hash.js';
import { toHashString } from '../types/Hash.js';
import { isDepositNote, isChangeNote } from '../types/Note.js';
import {
  deriveDepositNullifier,
  deriveDepositSecret,
  deriveChangeNullifier,
  deriveChangeSecret,
  deriveRefundNullifier,
  deriveRefundSecret,
  derivePrecommitment,
  derivedNoteCommitment,
} from './noteDerivation.js';
import { InvalidWithdrawalNoteError } from './errors.js';

/**
 * BN254 scalar field modulus for ZK-SNARK circuits
 */
export const SNARK_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Context hash for withdrawal proofs
 */
export type ContextHash = string;

/**
 * Withdrawal derivation result (same-chain)
 */
export interface WithdrawalDerivation {
  /** Context hash for proof */
  contextHash: ContextHash;

  /** New nullifier for change note */
  newNullifier: bigint;

  /** New secret for change note */
  newSecret: bigint;

  /** Existing nullifier being spent */
  existingNullifier: bigint;

  /** Existing secret being spent */
  existingSecret: bigint;

  /** Commitment of the note being spent */
  existingCommitment: CommitmentHash;
}

/**
 * Cross-chain withdrawal derivation result
 */
export interface CrosschainWithdrawalDerivation extends WithdrawalDerivation {
  /** Refund nullifier for failed withdrawal */
  refundNullifier: bigint;

  /** Refund secret for failed withdrawal */
  refundSecret: bigint;

  /** Refund commitment hash */
  refundCommitment: CommitmentHash;
}

/**
 * Hash data to BigInt using keccak256 and mod scalar field
 *
 * @param data - Hex string to hash
 * @returns BigInt modulo SNARK scalar field
 */
export function hashToBigInt(data: string): bigint {
  const hash = keccak256(data as `0x${string}`);
  return BigInt(hash) % SNARK_SCALAR_FIELD;
}

/**
 * Calculate withdrawal context hash
 *
 * Computes the context hash used in ZK proofs by encoding withdrawal data
 * and pool scope, then hashing and reducing modulo the SNARK scalar field.
 *
 * @param poolScope - Pool scope identifier
 * @param withdrawalData - Tuple of [processooor address, encoded data]
 * @returns Context hash as string
 *
 * @example
 * ```typescript
 * const contextHash = calculateContextHash(
 *   12345n,
 *   ["0x...", "0x..."]
 * );
 * ```
 */
export function calculateContextHash(
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): ContextHash {
  const encoded = encodeAbiParameters(
    [{ type: 'tuple', components: [{ type: 'address' }, { type: 'bytes' }] }, { type: 'uint256' }],
    [withdrawalData as readonly [`0x${string}`, `0x${string}`], poolScope],
  );
  return toHashString(hashToBigInt(encoded));
}

/**
 * Derive refund commitment for cross-chain withdrawals
 *
 * @param amount - Refund amount
 * @param label - Note label
 * @param refundNullifier - Refund nullifier
 * @param refundSecret - Refund secret
 * @returns Refund commitment hash
 */
export function deriveRefundCommitment(
  amount: bigint,
  label: bigint,
  refundNullifier: bigint,
  refundSecret: bigint,
): CommitmentHash {
  const refundPrecommitment = derivePrecommitment(refundNullifier, refundSecret);
  return toHashString(poseidon3([amount, label, refundPrecommitment]));
}

/**
 * Derive withdrawal inputs for deposit note
 *
 * @param note - Deposit note being spent
 * @param accountKey - Account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope identifier
 * @param withdrawalData - Withdrawal data tuple
 * @returns Withdrawal derivation
 */
function deriveDepositWithdrawal(
  note: DepositNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  // Existing credentials (deposit)
  const existingNullifier = deriveDepositNullifier(accountKey, poolAddress, note.depositIndex);
  const existingSecret = deriveDepositSecret(accountKey, poolAddress, note.depositIndex);

  // New credentials (change)
  const newNullifier = deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, 1);
  const newSecret = deriveChangeSecret(accountKey, poolAddress, note.depositIndex, 1);

  // Context and commitment
  const contextHash = calculateContextHash(poolScope, withdrawalData);
  const existingCommitment = toHashString(derivedNoteCommitment(accountKey, note));

  return {
    contextHash,
    newNullifier,
    newSecret,
    existingNullifier,
    existingSecret,
    existingCommitment,
  };
}

/**
 * Derive withdrawal inputs for change note
 *
 * @param note - Change note being spent
 * @param accountKey - Account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope identifier
 * @param withdrawalData - Withdrawal data tuple
 * @returns Withdrawal derivation
 */
function deriveChangeWithdrawal(
  note: ChangeNote,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  // Existing credentials (change)
  const existingNullifier = deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, note.changeIndex);
  const existingSecret = deriveChangeSecret(accountKey, poolAddress, note.depositIndex, note.changeIndex);

  // New credentials (next change)
  const newNullifier = deriveChangeNullifier(accountKey, poolAddress, note.depositIndex, note.changeIndex + 1);
  const newSecret = deriveChangeSecret(accountKey, poolAddress, note.depositIndex, note.changeIndex + 1);

  // Context and commitment
  const contextHash = calculateContextHash(poolScope, withdrawalData);
  const existingCommitment = toHashString(derivedNoteCommitment(accountKey, note));

  return {
    contextHash,
    newNullifier,
    newSecret,
    existingNullifier,
    existingSecret,
    existingCommitment,
  };
}

/**
 * Derive withdrawal inputs (same-chain)
 *
 * Pure function that derives all necessary parameters for a withdrawal proof.
 * Uses discriminated union type guards for type safety.
 *
 * @param note - Note being spent
 * @param accountKey - Account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope identifier
 * @param withdrawalData - Withdrawal data tuple
 * @returns Complete withdrawal derivation
 *
 * @example
 * ```typescript
 * const derivation = deriveWithdrawalInputs(
 *   note,
 *   accountKey,
 *   "0x...",
 *   12345n,
 *   ["0x...", "0x..."]
 * );
 * ```
 */
export function deriveWithdrawalInputs(
  note: Note,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): WithdrawalDerivation {
  // Use discriminated union type guards
  if (isDepositNote(note)) {
    return deriveDepositWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  } else if (isChangeNote(note)) {
    return deriveChangeWithdrawal(note, accountKey, poolAddress, poolScope, withdrawalData);
  }

  // Only refund notes reach here
  throw new InvalidWithdrawalNoteError('refund');
}

/**
 * Derive cross-chain withdrawal inputs
 *
 * Pure function that derives all necessary parameters for a cross-chain withdrawal proof,
 * including refund credentials.
 *
 * @param note - Note being spent
 * @param accountKey - Account key for derivation
 * @param poolAddress - Pool contract address
 * @param poolScope - Pool scope identifier
 * @param withdrawalData - Withdrawal data tuple
 * @returns Complete cross-chain withdrawal derivation
 *
 * @example
 * ```typescript
 * const derivation = deriveCrosschainWithdrawalInputs(
 *   note,
 *   accountKey,
 *   "0x...",
 *   12345n,
 *   ["0x...", "0x..."]
 * );
 * ```
 */
export function deriveCrosschainWithdrawalInputs(
  note: Note,
  accountKey: bigint,
  poolAddress: string,
  poolScope: bigint,
  withdrawalData: readonly [string, string],
): CrosschainWithdrawalDerivation {
  // Get base derivation (same-chain logic)
  const base = deriveWithdrawalInputs(note, accountKey, poolAddress, poolScope, withdrawalData);

  // Derive refund credentials
  // Refund uses same changeIndex as the new change note
  const nextChangeIndex = isDepositNote(note) ? 1 : note.changeIndex + 1;

  const refundNullifier = deriveRefundNullifier(accountKey, poolAddress, note.depositIndex, nextChangeIndex);
  const refundSecret = deriveRefundSecret(accountKey, poolAddress, note.depositIndex, nextChangeIndex);

  // Calculate refund commitment
  const remainingAmount = BigInt(note.amount);
  const refundCommitment = deriveRefundCommitment(remainingAmount, BigInt(note.label), refundNullifier, refundSecret);

  return {
    ...base,
    refundNullifier,
    refundSecret,
    refundCommitment,
  };
}
