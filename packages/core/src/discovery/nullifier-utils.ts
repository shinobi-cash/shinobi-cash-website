/**
 * @shinobi-cash/core/discovery
 * Nullifier derivation and hashing utilities
 */

import { poseidon1 } from 'poseidon-lite/poseidon1';
import { deriveDepositNullifier, deriveDepositSecret, derivePrecommitment } from '../deposit/index.js';
import { deriveChangeNullifier } from '../withdrawal/index.js';

/**
 * Derive the nullifier for a note at a given position
 * - changeIndex 0: uses deposit nullifier derivation
 * - changeIndex > 0: uses change nullifier derivation
 */
export function deriveNullifier(
  accountKey: bigint,
  poolAddress: string,
  chainId: number | bigint | string,
  depositIndex: number,
  changeIndex: number,
): bigint {
  return changeIndex === 0
    ? deriveDepositNullifier(accountKey, poolAddress, chainId, depositIndex)
    : deriveChangeNullifier(accountKey, poolAddress, chainId, depositIndex, changeIndex);
}

/**
 * Hash a nullifier using poseidon1
 * Returns the hash as a string (decimal representation)
 */
export function hashNullifier(nullifier: bigint): string {
  return poseidon1([nullifier]).toString();
}

/**
 * Derive and hash a nullifier in one step
 * Convenience function for common use case
 */
export function deriveAndHashNullifier(
  accountKey: bigint,
  poolAddress: string,
  chainId: number | bigint | string,
  depositIndex: number,
  changeIndex: number,
): string {
  const nullifier = deriveNullifier(accountKey, poolAddress, chainId, depositIndex, changeIndex);
  return hashNullifier(nullifier);
}

/**
 * Derive the precommitment hash for a deposit
 * Used to match deposits by scanning indices
 */
export function deriveDepositPrecommitment(
  accountKey: bigint,
  poolAddress: string,
  chainId: number | bigint | string,
  depositIndex: number,
): string {
  const nullifier = deriveDepositNullifier(accountKey, poolAddress, chainId, depositIndex);
  const secret = deriveDepositSecret(accountKey, poolAddress, chainId, depositIndex);
  return derivePrecommitment(nullifier, secret).toString();
}
