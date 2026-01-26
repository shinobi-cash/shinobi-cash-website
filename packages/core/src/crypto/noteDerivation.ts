/**
 * Note Derivation - Core Cryptographic Operations
 *
 * This module provides the core cryptographic primitives for deriving nullifiers,
 * secrets, and commitments for notes in the Shinobi Cash privacy pool.
 *
 * All operations use Poseidon hashing optimized for BN254 scalar field arithmetic,
 * compatible with ZK-SNARK circuits.
 */

import type { Note } from '../types/Note.js';
import { poseidon2 } from 'poseidon-lite/poseidon2';
import { poseidon3 } from 'poseidon-lite/poseidon3';
import { encodePacked, getAddress, keccak256 } from 'viem/utils';

// BN254 scalar field (same as SNARK_SCALAR_FIELD)
const F = 21888242871839275222246405745257275088548364400416034343698204186575808495617n as const;

// ---- helpers --------------------------------------------------------------

const hexToBigInt = (hex: `0x${string}`) => BigInt(hex);
const modF = (x: bigint) => ((x % F) + F) % F;

// Turn an arbitrary byte string into a field element (uniform-ish reducer)
const fieldFromKeccak = (bytes: `0x${string}`) => modF(hexToBigInt(keccak256(bytes)));

// Normalize EIP-55 and pack typed context deterministically
function contextField(
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
  tag: `0x${string}`,
) {
  const addr = getAddress(poolAddress); // checksum normalize
  // Note: pack as (address, uint64, uint64, bytes32 tag)
  const packed = encodePacked(
    ['address', 'uint64', 'uint64', 'bytes32'],
    [addr, BigInt(depositIndex), BigInt(changeIndex), tag],
  );
  return fieldFromKeccak(packed);
}

// Poseidon2 is arity-2; use a keyed-PRF with domain separation: H2(key, H2(ctx, dom))
const prf2 = (key: bigint, ctx: bigint, dom: bigint) => modF(poseidon2([key, modF(poseidon2([ctx, dom]))]));

/**
 * Parse and normalize a user key to a BN254 field element
 *
 * @param userKey - User key as hex string, decimal string, or bigint
 * @returns Normalized field element
 *
 * @example
 * ```typescript
 * const key1 = parseUserKey("0x1234..."); // hex
 * const key2 = parseUserKey("12345");     // decimal
 * const key3 = parseUserKey(12345n);      // bigint
 * ```
 */
export function parseUserKey(userKey: string | bigint): bigint {
  if (typeof userKey === 'bigint') return modF(userKey);
  const s = userKey.trim();
  if (s.startsWith('0x')) return modF(hexToBigInt(s as `0x${string}`));
  return modF(BigInt(s)); // decimal string
}

// ---- domain tags (bytes32 -> field) ---------------------------------------

const TAG_DEPOSIT_NULLIFIER = keccak256(encodePacked(['string'], ['shinobi.cash:DepositNullifierV1']));
const TAG_DEPOSIT_SECRET = keccak256(encodePacked(['string'], ['shinobi.cash:DepositSecretV1']));
const TAG_CHANGE_NULLIFIER = keccak256(encodePacked(['string'], ['shinobi.cash:ChangeNullifierV1']));
const TAG_CHANGE_SECRET = keccak256(encodePacked(['string'], ['shinobi.cash:ChangeSecretV1']));
const TAG_REFUND_NULLIFIER = keccak256(encodePacked(['string'], ['shinobi.cash:RefundNullifierV1']));
const TAG_REFUND_SECRET = keccak256(encodePacked(['string'], ['shinobi.cash:RefundSecretV1']));

const DOM_DEPOSIT_NULLIFIER = fieldFromKeccak(TAG_DEPOSIT_NULLIFIER);
const DOM_DEPOSIT_SECRET = fieldFromKeccak(TAG_DEPOSIT_SECRET);
const DOM_CHANGE_NULLIFIER = fieldFromKeccak(TAG_CHANGE_NULLIFIER);
const DOM_CHANGE_SECRET = fieldFromKeccak(TAG_CHANGE_SECRET);
const DOM_REFUND_NULLIFIER = fieldFromKeccak(TAG_REFUND_NULLIFIER);
const DOM_REFUND_SECRET = fieldFromKeccak(TAG_REFUND_SECRET);

// ---- public API -----------------------------------------------------------

/**
 * Derive the nullifier for a deposit note (changeIndex implicitly 0)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Sequential deposit index
 * @returns Nullifier as field element
 */
export function deriveDepositNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, 0n, TAG_DEPOSIT_NULLIFIER);
  return prf2(k, ctx, DOM_DEPOSIT_NULLIFIER);
}

/**
 * Derive the secret for a deposit note (changeIndex implicitly 0)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Sequential deposit index
 * @returns Secret as field element
 */
export function deriveDepositSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, 0n, TAG_DEPOSIT_SECRET);
  return prf2(k, ctx, DOM_DEPOSIT_SECRET);
}

/**
 * Derive the nullifier for a change note (after withdrawal)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Original deposit index
 * @param changeIndex - Change note sequence number
 * @returns Nullifier as field element
 */
export function deriveChangeNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_CHANGE_NULLIFIER);
  return prf2(k, ctx, DOM_CHANGE_NULLIFIER);
}

/**
 * Derive the secret for a change note (after withdrawal)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Original deposit index
 * @param changeIndex - Change note sequence number
 * @returns Secret as field element
 */
export function deriveChangeSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_CHANGE_SECRET);
  return prf2(k, ctx, DOM_CHANGE_SECRET);
}

/**
 * Derive the nullifier for a refund note (from failed cross-chain withdrawal)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Original deposit index
 * @param changeIndex - Change note sequence number
 * @returns Nullifier as field element
 */
export function deriveRefundNullifier(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_REFUND_NULLIFIER);
  return prf2(k, ctx, DOM_REFUND_NULLIFIER);
}

/**
 * Derive the secret for a refund note (from failed cross-chain withdrawal)
 *
 * @param userKey - User's account key
 * @param poolAddress - Pool contract address
 * @param depositIndex - Original deposit index
 * @param changeIndex - Change note sequence number
 * @returns Secret as field element
 */
export function deriveRefundSecret(
  userKey: string | bigint,
  poolAddress: string,
  depositIndex: number | bigint,
  changeIndex: number | bigint,
): bigint {
  const k = parseUserKey(userKey);
  const ctx = contextField(poolAddress, depositIndex, changeIndex, TAG_REFUND_SECRET);
  return prf2(k, ctx, DOM_REFUND_SECRET);
}

/**
 * Derive precommitment from nullifier and secret
 *
 * Generic primitive for computing precommitment hash.
 * Used in deposit commitments, note commitments, and ZK proofs.
 *
 * @param nullifier - Nullifier field element
 * @param secret - Secret field element
 * @returns Precommitment as Poseidon2([nullifier, secret])
 *
 * @example
 * ```typescript
 * const nullifier = deriveDepositNullifier(accountKey, poolAddress, depositIndex);
 * const secret = deriveDepositSecret(accountKey, poolAddress, depositIndex);
 * const precommitment = derivePrecommitment(nullifier, secret);
 * ```
 */
export function derivePrecommitment(nullifier: bigint, secret: bigint): bigint {
  return poseidon2([nullifier, secret]);
}

/**
 * Derive the full commitment for a note
 *
 * This matches the smart contract and ZK circuit commitment calculation:
 * commitment = Poseidon3([amount, label, precommitment])
 * where precommitment = Poseidon2([nullifier, secret])
 *
 * @param accountKey - User's account key
 * @param note - Note to compute commitment for
 * @returns Commitment as field element
 */
export function derivedNoteCommitment(accountKey: bigint, note: Note): bigint {
  let nullifier: bigint;
  let secret: bigint;

  if (note.changeIndex === 0) {
    // Deposit note
    nullifier = deriveDepositNullifier(accountKey, note.poolAddress, note.depositIndex);
    secret = deriveDepositSecret(accountKey, note.poolAddress, note.depositIndex);
  } else {
    // Change note
    nullifier = deriveChangeNullifier(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
    secret = deriveChangeSecret(accountKey, note.poolAddress, note.depositIndex, note.changeIndex);
  }

  const precommitment = derivePrecommitment(nullifier, secret);
  const commitmentHash = poseidon3([BigInt(note.amount), BigInt(note.label), precommitment]);
  return commitmentHash;
}
